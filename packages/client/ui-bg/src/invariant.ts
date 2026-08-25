/**
 * Runtime invariant companion for `@deepseek-ai/dsh-client-ui-bg`.
 *
 * No runtime invariant: this plugin is a pure presentation consumer of the
 * settings section it owns. The user-visible effect (background painted to
 * `<body>`) is the only event the feature emits, and it is already covered
 * by the Host-side `settings.onChange` callback in `apply()`. No session,
 * tool, or telemetry stream needs a paired reporter.
 */

import type {} from '@deepseek-ai/dsh-invariants'

/** Stable companion name registered by the loader. */
export const name = 'ui-bg-invariant'

/** Empty installer: this plugin emits no events requiring a runtime check. */
export function apply(): void {
  // No-op: see module doc.
}

/** Required by the test invariant loader: every plugin must declare `invariants` so
 *  the framework guarantees the runtime invariant companion is mounted.
 *  The companion is the same apply() above (no-op), so the array has one entry. */
export const inject: readonly string[] = ['invariants']
