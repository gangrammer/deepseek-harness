/**
 * Background source editor row + slot adapters. Two adapters (frame and
 * hero) each fill a `settings.general.item` slot with their own injected
 * write face; both read their current source from a shared store that the
 * plugin's apply-world effect keeps in sync with the durable settings.
 */
import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { BgSource } from '../bg-settings.ts'
import type { BgKey } from './locales.ts'
import type { createBgRowStore } from './settings-store.ts'
import css from './AppearanceBgRow.module.css'

// Type-only: pull the `settings.bg` LocaleNamespaceMap augmentation from the
// same module that declares it so PropsLocale<'settings.bg'> resolves to
// `{ t: TranslateNS<'settings.bg'> }` here as well.
import type {} from './index.ts'

/** Locale seat type for the ui-bg namespace. */
export type BgLocale = PropsLocale<'settings.bg'>['t']

/** Adapter injected face for the window-background row. */
export interface FrameInjected {
  setFrame: (next: BgSource) => void
}

/** Adapter injected face for the welcome-screen-background row. */
export interface HeroInjected {
  setHero: (next: BgSource) => void
}

/** Common slot props: runtime share + store share + locale seat. */
type CommonProps =
  & PropsRuntime<'settings.general.item'>
  & PropsStore<ReturnType<typeof createBgRowStore>>
  & PropsLocale<'settings.bg'>

/** Window-background slot props: common plus the injected write face. */
type FrameRowProps = CommonProps & FrameInjected

/** Welcome-screen slot props: common plus the injected write face. */
type HeroRowProps = CommonProps & HeroInjected

/** Allowed image MIME types for the local-file picker. */
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'] as const

/** Upper bound on the local-file upload (4 MB). */
const MAX_FILE_BYTES = 4 * 1024 * 1024

/** Edit a single BgSource; commits through `onChange` on every change. */
function SourceEditor({
  source,
  onChange,
  t,
}: {
  source: BgSource
  onChange: (next: BgSource) => void
  t: BgLocale
}) {
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const setKind = useCallback((kind: BgSource['kind']) => {
    setError(null)
    if (kind === 'none') onChange({ kind: 'none' })
    else if (kind === 'color') onChange({ kind: 'color', value: '#1f2933' })
    else if (kind === 'url') onChange({ kind: 'url', value: '' })
    else onChange({ kind: 'file', value: '' })
  }, [onChange])

  const onColorInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
      setError(t('errorBadColor'))
      return
    }
    setError(null)
    onChange({ kind: 'color', value })
  }, [onChange, t])

  const onUrlInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (value.length > 0 && !/^https?:\/\//.test(value)) {
      setError(t('errorBadUrl'))
      return
    }
    setError(null)
    onChange({ kind: 'url', value })
  }, [onChange, t])

  const onFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file === undefined) return
    if (file.size > MAX_FILE_BYTES) {
      setError(t('errorTooLarge'))
      return
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(t('errorBadType'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        setError(t('errorBadType'))
        return
      }
      setError(null)
      onChange({ kind: 'file', value: result })
    }
    reader.onerror = () => { setError(t('errorBadType')) }
    reader.readAsDataURL(file)
  }, [onChange, t])

  return (
    <div className={css.slot}>
      <div className={css.kindRow}>
        {(['none', 'color', 'url', 'file'] as const).map(kind => (
          <button
            key={kind}
            type="button"
            className={css.kindButton}
            data-active={source.kind === kind}
            onClick={() => { setKind(kind) }}
          >
            {t(`source${kind.charAt(0).toUpperCase() + kind.slice(1)}` as BgKey)}
          </button>
        ))}
      </div>
      {source.kind === 'color' && (
        <input
          type="text"
          className={css.colorInput}
          placeholder={t('colorPlaceholder')}
          value={source.value}
          onChange={onColorInput}
        />
      )}
      {source.kind === 'url' && (
        <input
          type="url"
          className={css.urlInput}
          placeholder={t('urlPlaceholder')}
          value={source.value}
          onChange={onUrlInput}
        />
      )}
      {source.kind === 'file' && (
        <label
          className={css.filePicker}
          data-has-file={source.value.length > 0}
        >
          {t('fileHint')}
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={onFileChange}
          />
        </label>
      )}
      {error !== null && <div className={css.error}>{error}</div>}
    </div>
  )
}

/** Slot adapter for the window-background row. Reads frame from the store. */
export function FrameRowAdapter({ t, useStore, setFrame }: FrameRowProps) {
  const frame = useStore(s => s.frame)
  return (
    <AppearanceBgRow
      t={t}
      labelKey="frameLabel"
      source={frame}
      onChange={setFrame}
    />
  )
}

/** Slot adapter for the welcome-screen row. Reads hero from the store. */
export function HeroRowAdapter({ t, useStore, setHero }: HeroRowProps) {
  const hero = useStore(s => s.hero)
  return (
    <AppearanceBgRow
      t={t}
      labelKey="heroLabel"
      source={hero}
      onChange={setHero}
    />
  )
}

/** One settings.general.item row editor for a single background slot. */
export function AppearanceBgRow({
  t,
  labelKey,
  source,
  onChange,
}: {
  t: BgLocale
  labelKey: 'frameLabel' | 'heroLabel'
  source: BgSource
  onChange: (next: BgSource) => void
}) {
  return (
    <div className={css.card}>
      <div className={css.title}>{t('title')}</div>
      <div className={css.subtitle}>{t('subtitle')}</div>
      <div className={css.slot}>
        <div className={css.slotLabel}>{t(labelKey)}</div>
        <SourceEditor source={source} onChange={onChange} t={t} />
      </div>
    </div>
  )
}
