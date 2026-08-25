/**
 * Client plugin body for `@deepseek-ai/dsh-client-ui-bg`.
 *
 * Registers two editors into the General settings section (`settings.general.item`):
 * one for the window background and one for the welcome screen background.
 * Both editors read from a single shared store that this apply world keeps
 * in sync with the durable `ui-bg` settings section. The plugin owns the
 * write surface (setFrame / setHero); the row adapters receive that as the
 * injected face.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings slot declarations (settings.general.item) and the
// settingsScope Context merge so this plugin compiles against the settings base layer.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import { BG_SETTINGS_KEY, DEFAULT_BG_SETTINGS, validateBgSettings, type BgSettings, type BgSource } from '../bg-settings.ts'
import { createBgRowStore, type BgRowState } from './settings-store.ts'
import { FrameRowAdapter, HeroRowAdapter, type FrameInjected, type HeroInjected } from './AppearanceBgRow.tsx'
import { en, zh } from './locales.ts'

/**
 * Domain event emitted whenever the durable bg section is revised. Carries
 * the new full snapshot so the row store can adopt it with a single revision
 * fence (the store action drops stale duplicates).
 */
export interface BgChangeEvent {
  frame: BgSource
  hero: BgSource
  revision: number
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The ui-bg settings row copy. */
    'settings.bg': keyof typeof zh
  }
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    /**
     * Durable bg section revised (initial load or accepted write). Carries
     * the new full snapshot so subscribers (boot-bg script, audit trail)
     * can adopt without polling the settings transport.
     * @param event - Current immutable bg snapshot.
     * @mode emit
     */
    'bg/change'(event: BgChangeEvent): void
  }
}

/** Cordis plugin name used by loader diagnostics. */
export const name = 'ui-bg'

/**
 * Cordis inject dependencies. `remote` carries the forwarded settings
 * invalidation that `ctx.settingsScope.bind(spec)` subscribes to on this
 * context. `connection` is required so the scope's RPC channel is ready
 * before the apply world starts writing.
 */
export const inject = ['settingsScope', 'locale', 'slots', 'connection', 'remote']

/** Stable locale namespace key for this plugin's copy. */
const NS = 'settings.bg'

/** Client-side mirror of the Host-bound namespace name (no settings package import). */
const BG_SETTINGS_NAMESPACE = BG_SETTINGS_KEY as never

/** Bump on every successful durable write so the store can dedupe revisions. */
let writeRevision = 0

/**
 * Apply one background source to the DOM by writing its CSS custom property
 * on `document.body`. Mirrors the boot-bg inline script so the live state
 * stays in sync with the boot-time paint after the plugin tree activates.
 *
 * The frame slot also overrides `--dsw-specific-sidebar-fill` (the sidebar's
 * own background variable) so the sidebar picks up the user's background
 * choice — without this, the sidebar keeps its theme color because it reads
 * a different CSS variable than `--dsw-alias-bg-base`.
 */
function applyBgToDom(slot: 'frame' | 'hero', source: BgSource): void {
  if (typeof document === 'undefined' || document.body === null) return
  const varName = `--dsw-user-bg-${slot}`
  if (source.kind === 'none') {
    document.body.style.removeProperty(varName)
    // Restore the sidebar fill to its theme default.
    if (slot === 'frame') {
      document.body.style.removeProperty('--dsw-specific-sidebar-fill')
    }
    return
  }
  // color -> raw CSS color literal; url/file -> url("...") with quote escaping.
  const val = source.kind === 'color'
    ? source.value
    : `url("${source.value.replace(/"/g, '%22')}")`
  document.body.style.setProperty(varName, val)
  // Alias the user background over the theme default so every reader that
  // resolves --dsw-alias-bg-base picks up the user's choice.
  document.body.style.setProperty('--dsw-alias-bg-base', `var(${varName})`)
  // The sidebar uses its own fill variable, so override it too when the
  // frame background changes.
  if (slot === 'frame') {
    document.body.style.setProperty('--dsw-specific-sidebar-fill', `var(${varName})`)
  }
}

/**
 * Register the two appearance-bg rows into the General settings panel.
 *
 * Pattern mirrors ui-theme's Appearance row: a single store holds the
 * section snapshot; one effect mirrors durable revisions into the store
 * and emits `bg/change`; the row adapters receive only the write face
 * (`setFrame` / `setHero`) as injected props and read their source from
 * the store through `useStore`.
 *
 * @param ctx - client cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-bg: settings row dictionaries')

  const scope = ctx.settingsScope.bind<BgSettings>({ namespace: BG_SETTINGS_NAMESPACE })
  const store = createBgRowStore()

  let bound: BoundActions<typeof store> | undefined

  /** Mirror the durable snapshot into the store + emit the change event. */
  const sync = (value: BgSettings): void => {
    const err = validateBgSettings(value)
    if (err !== null) {
      // Surface the validation problem so it is not silently dropped.
      console.warn(`[ui-bg] rejected invalid section: ${err}`)
      return
    }
    writeRevision += 1
    const event: BgChangeEvent = {
      frame: value.frame,
      hero: value.hero,
      revision: writeRevision,
    }
    bound?.sync({ frame: event.frame, hero: event.hero }, event.revision)
    applyBgToDom('frame', event.frame)
    applyBgToDom('hero', event.hero)
    ctx.emit('bg/change', event)
  }

  /**
   * Watch the durable section. The bound scope invokes this callback on
   * every accepted write (including the initial snapshot delivered by the
   * Host). Returning a disposer lets `ctx.effect` tear it down on plugin
   * unload.
   */
  ctx.effect(() => {
    // Subscribe by reference: the SettingsScope notify callback takes no
    // arguments; the listener reads `getSnapshot().value` on demand. This
    // mirrors ui-theme's host.subscribe(() => this.adopt()).
    const unsubscribe = scope.subscribe(() => {
      const value = scope.getSnapshot().value
      if (value === undefined) return
      sync(value)
    })
    return unsubscribe
  }, 'ui-bg: durable section mirror')

  const injected = (actions: BoundActions<typeof store>): FrameInjected & HeroInjected => {
    bound = actions
    // Adopt the current durable snapshot in case the initial sync ran
    // before the slot registered its store bindings.
    const current = scope.getSnapshot().value
    if (current !== undefined) sync(current)
    return {
      setFrame: (next: BgSource) => {
        // Optimistic update: push into the store + DOM immediately so the
        // row re-renders and the background paints without waiting for the
        // RPC round-trip. The durable write follows asynchronously; if it
        // fails the subscribe callback will reconcile with the Host's
        // authoritative value.
        const hero = scope.getSnapshot().value?.hero ?? DEFAULT_BG_SETTINGS.hero
        writeRevision += 1
        bound?.sync({ frame: next, hero }, writeRevision)
        applyBgToDom('frame', next)
        void scope.set('frame', next).catch((e: unknown) => {
          console.error('[ui-bg] scope.set("frame") failed:', e)
        })
      },
      setHero: (next: BgSource) => {
        const frame = scope.getSnapshot().value?.frame ?? DEFAULT_BG_SETTINGS.frame
        writeRevision += 1
        bound?.sync({ frame, hero: next }, writeRevision)
        applyBgToDom('hero', next)
        void scope.set('hero', next).catch((e: unknown) => {
          console.error('[ui-bg] scope.set("hero") failed:', e)
        })
      },
    }
  }

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'bg-frame',
    order: 20,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): FrameInjected => injected(actions),
  }, FrameRowAdapter))

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'bg-hero',
    order: 21,
    store,
    locale: NS,
    inject: (actions: BoundActions<typeof store>): HeroInjected => injected(actions),
  }, HeroRowAdapter))
}

/** Re-export for tests and downstream consumers. */
export { BG_SETTINGS_KEY, DEFAULT_BG_SETTINGS, type BgSettings, type BgSource, type BgRowState }
