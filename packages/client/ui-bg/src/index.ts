/**
 * Host registration for the user-configurable web background.
 *
 * The Host half owns two things: a durable settings section (`ui-bg`) that
 * keeps the two slots across restarts, and an index-html transformer that
 * paints the resolved values before the client plugin tree activates. The
 * client half (`./client/`) reads the same section through the framework's
 * global `useSettingsScope` hook and writes changes back through the same
 * revision-fenced scope.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { injectBootBg } from './boot-bg.ts'
import {
  BG_SETTINGS_KEY, BgSettingsSchema, DEFAULT_BG_SETTINGS,
  validateBgSettings,
  type BgSettings,
} from './bg-settings.ts'

export {
  BG_SETTINGS_KEY, BgSettingsSchema, DEFAULT_BG_SETTINGS, validateBgSettings, validateBgSource,
  type BgSettings, type BgSource,
} from './bg-settings.ts'

/** The Host-bound settings namespace (created here so the client half can stay pure). */
const BG_SETTINGS_NAMESPACE = settingsNamespace(BG_SETTINGS_KEY)

/** Cordis plugin name used by loader diagnostics. */
export const name = 'ui-bg'

/** No hard service inject; the Host registers its own section and a transformer. */
export const inject: string[] = []

/** Read the registered section or use the schema defaults when no settings provider is mounted. */
function readSettings(ctx: Context): BgSettings {
  const settings = ctx.get('settings')
  if (settings === undefined) return DEFAULT_BG_SETTINGS
  const section = settings.get(BG_SETTINGS_NAMESPACE) as BgSettings | undefined
  if (section === undefined) return DEFAULT_BG_SETTINGS
  return section
}

/**
 * Register the durable background section and pre-plugin index transform when
 * their optional Host services are composed. Mirrors ui-theme's pattern: the
 * `settings` service waits on its provider, the `webServer` service owns the
 * index HTML tap, and either may be absent in a non-web deployment without
 * breaking plugin registration.
 * @param ctx - Host context that may acquire settings and HTTP services.
 */
export function apply(ctx: Context, config: BgSettings = DEFAULT_BG_SETTINGS): void {
  installSettingsSection(ctx, BG_SETTINGS_NAMESPACE, BgSettingsSchema, config, {
    validate: (value) => {
      const reason = validateBgSettings(value as BgSettings)
      if (reason !== null) throw new Error(reason)
    },
    setSource: () => { /* client half reads on demand; no Host re-registration needed */ },
    onChange: () => { /* same: client observes its own scope */ },
  })
  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => httpCtx.webServer.tapIndex((html: string) => injectBootBg(html, readSettings(ctx))),
      'client-ui-bg: initial background bootstrap',
    )
  })
}
