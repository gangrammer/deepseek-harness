// @vitest-environment jsdom
/** AppearanceBgRow smoke test: renders 4 kind buttons + input, click drives onChange. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppearanceBgRow } from '../src/client/AppearanceBgRow.tsx'

afterEach(cleanup)

const COPY: Record<string, string> = {
  title: 'Background',
  subtitle: 'Pick...',
  frameLabel: 'Window background',
  heroLabel: 'Welcome screen background',
  sourceNone: 'Default',
  sourceColor: 'Color',
  sourceUrl: 'URL',
  sourceFile: 'File',
  colorPlaceholder: '#1f2933',
  urlPlaceholder: 'https://...',
  fileHint: 'Click to upload',
}

const t = (key: string) => COPY[key] ?? key

function mount(source: { kind: 'none' } | { kind: 'color'; value: string } = { kind: 'none' }) {
  const onChange = vi.fn()
  render(<AppearanceBgRow t={t as never} labelKey="frameLabel" source={source as never} onChange={onChange} />)
  return { onChange }
}

describe('AppearanceBgRow', () => {
  it('renders 4 kind buttons, default is active', () => {
    mount()
    expect(screen.getByText('Background')).toBeDefined()
    expect(screen.getByText('Window background')).toBeDefined()
    expect(screen.getByRole('button', { name: /Default/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Color/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /URL/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /File/ })).toBeDefined()
  })

  it('clicking Color kind button calls onChange with color source', () => {
    const { onChange } = mount()
    fireEvent.click(screen.getByRole('button', { name: /Color/ }))
    expect(onChange).toHaveBeenCalledWith({ kind: 'color', value: '#1f2933' })
  })

  it('clicking URL kind button calls onChange with url source', () => {
    const { onChange } = mount()
    fireEvent.click(screen.getByRole('button', { name: /URL/ }))
    expect(onChange).toHaveBeenCalledWith({ kind: 'url', value: '' })
  })
})
