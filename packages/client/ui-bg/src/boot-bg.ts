/**
 * Host-rendered background bootstrap for the browser's pre-plugin interval.
 * Mirrors the theme bootstrap's pattern (ui-theme/boot-theme.ts): inject an
 * inline script that writes the resolved background values to document
 * attributes before the shell mounts and the client plugin tree activates.
 *
 * `data-ds-bg-frame` and `data-ds-bg-hero` carry JSON-encoded BgSource so the
 * inline script is small and the client half can decode them at apply time
 * without a network round-trip.
 */

import type { BgSettings, BgSource } from './bg-settings.ts'

/** Serialize one source for an HTML attribute. */
function toAttrValue(source: BgSource): string {
  return JSON.stringify(source)
}

/** Build the inline script that paints the resolved backgrounds. */
function bootBgScript(frameAttr: string, heroAttr: string): string {
  return `<script>(() => {
  function apply(slot, attr) {
    var raw = document.body.getAttribute(attr)
    if (raw === null || raw === '') return
    var src
    try { src = JSON.parse(raw) } catch (_e) { return }
    if (!src) return
    document.body.setAttribute('data-ds-bg-' + slot, src.kind)
    if (src.kind === 'none') {
      document.body.style.removeProperty('--dsw-user-bg-' + slot)
      // Restore the sidebar fill to its theme default.
      if (slot === 'frame') {
        document.body.style.removeProperty('--dsw-specific-sidebar-fill')
      }
      // When the slot is cleared, the corresponding alias inherits the theme
      // default again. Setting an empty value would paint 'none' over the page.
      return
    }
    var val = src.kind === 'color' ? src.value : 'url("' + src.value.replace(/"/g, '%22') + '")'
    document.body.style.setProperty('--dsw-user-bg-' + slot, val)
    // Alias the user background over the theme default for every reader that
    // resolves --dsw-alias-bg-base. ui-layout/AppFrame.module.css, ui-conversation
    // HeroShell.module.css, etc. all fall back to the alias.
    document.body.style.setProperty('--dsw-alias-bg-base', 'var(--dsw-user-bg-' + slot + ')')
    // The sidebar uses its own fill variable, so override it too when the
    // frame background changes.
    if (slot === 'frame') {
      document.body.style.setProperty('--dsw-specific-sidebar-fill', 'var(--dsw-user-bg-' + slot + ')')
    }
  }
  // Two passes: hero first (so its bg is the resolved value if no frame is set),
  // then frame overrides the alias when present.
  apply('hero', ${JSON.stringify(heroAttr)})
  apply('frame', ${JSON.stringify(frameAttr)})
})()</script>`
}

/**
 * Insert the background bootstrap immediately after the opening body tag,
 * before the shell mount and module script — matching ui-theme's pattern so
 * the page never paints a flash of the unconfigured background.
 * @param html - Raw application index HTML.
 * @param settings - Resolved background settings (or defaults).
 * @returns HTML containing the background bootstrap.
 */
export function injectBootBg(html: string, settings: BgSettings): string {
  const frameAttr = toAttrValue(settings.frame)
  const heroAttr = toAttrValue(settings.hero)
  const script = bootBgScript(frameAttr, heroAttr)
  const body = /<body(?:\s[^>]*)?>/i.exec(html)
  if (body === null) return `${html}${script}`
  const at = body.index + body[0].length
  return `${html.slice(0, at)}${script}${html.slice(at)}`
}
