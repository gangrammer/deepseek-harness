/**
 * ui-bg apply wiring: settings namespace registration, locale dictionaries,
 * declaration-aware General item row registrations, and inject face wiring.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { TestRemote } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as settingsApply, inject as settingsInject } from '@deepseek-ai/dsh-client-ui-settings/client'
import { apply, inject, BG_SETTINGS_KEY } from '@deepseek-ai/dsh-client-ui-bg/client'
import { FrameRowAdapter, HeroRowAdapter } from '../src/client/AppearanceBgRow.tsx'

const SLOT = 'settings.general.item'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  // Mirror ui-locale's own apply(): expose the locale instance to the slot
  // renderer so PropsLocale<...> resolves to { t: TranslateNS<...> } at the row.
  ctx.slots.installLocale(locale)
  const namespace = () => ({
    ns: BG_SETTINGS_KEY,
    schema: {} as never,
    value: { frame: { kind: 'none' }, hero: { kind: 'none' } },
    applies: 'live' as const,
    secrets: [],
    revision: 0,
  })
  const describe = vi.fn(() => Promise.resolve({
    rpcId: 'bg-describe' as never,
    result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [namespace()] } },
  }))
  const mutate = vi.fn(() => Promise.resolve({
    rpcId: 'bg-mutate' as never,
    result: { ok: true as const, value: namespace() },
  }))
  ctx.provide('connection', { api: { settings: { describe, mutate } }, isLoopback: true } as never)
  new TestRemote(ctx)
  await ctx.plugin({ inject: [...settingsInject], apply: settingsApply }).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, describe, mutate }
}

function declareItems(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { [SLOT]: { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

describe('ui-bg apply', () => {
  it('declares settingsScope + locale + slots + connection + remote', () => {
    expect(inject).toEqual(['settingsScope', 'locale', 'slots', 'connection', 'remote'])
  })

  it('registers two rows into settings.general.item, each with an inject factory', async () => {
    const b = await bench()
    declareItems(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.locale.bind('settings.bg')('title')).toBe('背景')
    // Also verify the registry directly: if bind returned the key verbatim,
    // the effect-driven register either didn't run or used a different ns.
    const debug = (b.locale as unknown as { _registries?: Map<string, unknown> })._registries
    console.log('locale ns registered?', !!debug, 'settings.bg present?', debug ? debug.has('settings.bg') : 'n/a')

    const entries = b.slots.entries(SLOT)
    const frame = entries.find(e => e.component === FrameRowAdapter)
    const hero = entries.find(e => e.component === HeroRowAdapter)
    expect(frame).toBeDefined()
    expect(hero).toBeDefined()
    expect(frame!.options).toMatchObject({ id: 'bg-frame', order: 20 })
    expect(hero!.options).toMatchObject({ id: 'bg-hero', order: 21 })

    // The inject factory must run and return the injected write face. The
    // row reads its current source from the shared store (PropsStore), so
    // only the write surface appears on the injected object.
    const face = (frame!.inject as () => { setFrame: (v: unknown) => void })()
    expect(typeof face.setFrame).toBe('function')
  })
})
