# `@deepseek-ai/dsh-client-ui-bg`

User-customizable web background. Adds two preference rows to the General settings panel: one for the window background and one for the welcome-screen background. Each row accepts a color, a remote URL, or a local file upload; the resolved value paints `<body>` before the page shell mounts, so the user never sees a flash of the unconfigured background.

## Configuration

`ui-bg` settings namespace; the Host half installs the schema through `installSettingsSection`, so any configuration surface that owns the `ui-bg` key (the Settings panel, host patches, the `--patch` CLI flag, etc.) can drive it.

| Field | Type | Default | Semantics |
|---|---|---|---|
| `frame.kind` | `'none' \| 'color' \| 'url' \| 'file'` | `'none'` | Window background source kind. |
| `frame.value` | `string` | `''` | CSS color (`#rgb` / `#rrggbb` / `#rrggbbaa`), remote URL (`http://…` or `https://…`), or data URL (`data:image/…`). |
| `hero.kind` | `'none' \| 'color' \| 'url' \| 'file'` | `'none'` | Welcome-screen background source kind. |
| `hero.value` | `string` | `''` | Same shape as `frame.value`. |

The `frame` slot aliases over `--dsw-alias-bg-base` for the whole AppFrame; the `hero` slot aliases over the same token, but the welcome shell paints its own backdrop inside the conversation view. When a slot is `'none'`, the next apply pass clears its alias and the theme default returns.

## Model Experience

- The user opens the General settings panel and sees two cards under "Background": Window and Welcome screen. Each card exposes a four-button kind selector (Default / Color / URL / Upload) and an inline input that swaps with the kind.
- A color input commits `#1f2933` as soon as the regex validates; a URL input commits when the value starts with `http://` or `https://`; a file input commits when the chosen file is ≤ 4 MB and matches one of `image/png`, `image/jpeg`, `image/gif`, `image/svg+xml`. Other shapes surface an inline error in the row and refuse the write at the schema's `validate` callback.
- Each write goes through `ctx.settingsScope.bind<BgSettings>(...)`, fences on the namespace revision, and persists to `~/.dsh/profiles/web/settings.yaml`. The Host-side `apply()` re-reads on every index-html tap and re-emits the inline boot script, so a saved change survives the next page load.
- The inline script runs before the shell mounts and sets `--dsw-user-bg-frame` and `--dsw-user-bg-hero` on `document.body`. The frame slot also aliases `--dsw-alias-bg-base` so every existing reader (AppFrame.module.css, HeroShell.module.css, etc.) inherits the user's value without a single source-file edit.

## Known Limitations and Deferred Work

- **No HMR re-apply for the boot script.** The Host reads the settings section at request time and injects the script once per HTML response; the client half subscribes through `ctx.settingsScope`, so the *visible* background flips after a save without a reload, but the pre-shell paint can only refresh on the next navigation. A live-subscription hook on `webServer.tapIndex` would close the gap.
- **The `file` source stores the data URL in the durable section.** The settings file grows linearly with every upload and is read fully into memory at boot. A future split could store uploads as attachments (via the `dsh-attachment` service) and persist only an attachment reference.
- **Remote URLs are not fetched at validation time.** A malformed URL passes the regex gate but may still fail to load in the browser; CSP, CORS, and broken links surface only when the page actually paints.
- **SVG uploads are accepted but not sanitized.** A user-supplied SVG can reference external resources or scripts that the same browser tab will then load. A sanitizer pass on the upload path is the right place to plug it.
- **Two `settings.general.item` registrations share one namespace.** A future split into `settings.section` (one card per slot) would let the user reorder them; today both rows live next to the Appearance row at `order: 20` and `order: 21`.
