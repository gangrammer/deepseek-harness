/**
 * Settings schema for the user-configurable web background. Two independent
 * slots (`frame` and `hero`) each carry a discriminated source: a plain
 * `color` (#rrggbb[a]), a remote `url` (https/http), or a `file` (data URL).
 *
 * The Schemastery schema provides defaults and shape normalization; the
 * custom `validate` callback in `installSettingsSection` does the deep
 * validation of each discriminated source.
 */
import z from '@deepseek-ai/schemastery'

/** Discriminated background source. `kind: 'none'` is the default. */
export type BgSource =
  | { kind: 'none' }
  | { kind: 'color'; value: string }
  | { kind: 'url'; value: string }
  | { kind: 'file'; value: string }

/** Two independent backgrounds, one for the whole AppFrame and one for the welcome hero. */
export interface BgSettings {
  frame: BgSource
  hero: BgSource
}

/** Validate a CSS color literal; accepts #rgb, #rrggbb, #rrggbbaa. */
const COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Validate an http(s) URL; data: and file: are not allowed as remote sources. */
const URL_REGEX = /^https?:\/\/\S+$/

/**
 * Validate one BgSource. Returns `null` for a well-formed source or an error
 * string suitable for surfacing in the settings UI.
 */
export function validateBgSource(source: BgSource): string | null {
  switch (source.kind) {
    case 'none':
      return null
    case 'color':
      return COLOR_REGEX.test(source.value) ? null : `color must be #rgb, #rrggbb or #rrggbbaa; got "${source.value}"`
    case 'url':
      // Empty URL is allowed as an intermediate state (user just clicked the
      // kind button but hasn't typed yet). The client-side onUrlInput guards
      // against malformed non-empty values; empty just means "not entered".
      return source.value.length === 0 || URL_REGEX.test(source.value)
        ? null
        : `url must start with http:// or https://; got "${source.value}"`
    case 'file':
      // Empty file is allowed as an intermediate state (user hasn't picked a
      // file yet). The file picker label is shown; empty just means "no file".
      return source.value.length === 0 || source.value.startsWith('data:')
        ? null
        : 'file source must be a data URL'
    default:
      return `unknown background kind: ${(source as { kind: unknown }).kind as string}`
  }
}

/** Validate the full section; returns `null` or the first error encountered. */
export function validateBgSettings(settings: BgSettings): string | null {
  return validateBgSource(settings.frame) ?? validateBgSource(settings.hero)
}

/**
 * Stable settings namespace identifier. The Host half passes this through
 * `settingsNamespace()` from `@deepseek-ai/dsh-settings`; the client half
 * uses the raw string so it never value-imports the settings package (the
 * client bundle purity gate would reject that).
 */
export const BG_SETTINGS_KEY = 'ui-bg'

/** Defaults used when no settings provider is mounted. */
export const DEFAULT_BG_SETTINGS: BgSettings = {
  frame: { kind: 'none' },
  hero: { kind: 'none' },
}

/**
 * Schemastery schema for the durable bg settings section. Provides defaults
 * and shape normalization at the settings-provider boundary. The deep
 * validation (color format, URL format, file non-empty) runs in the
 * `validate` callback passed to `installSettingsSection`.
 *
 * Each slot is a plain `z.any().default(...)` because the discriminated
 * union shape is validated by the custom `validate` callback, not by
 * Schemastery's type system (which has no first-class discriminated union).
 */
export const BgSettingsSchema: z<BgSettings> = z.object({
  frame: z.any().default({ kind: 'none' }),
  hero: z.any().default({ kind: 'none' }),
})
