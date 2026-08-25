/**
 * Background settings row store: mirrors the durable `ui-bg` section so the
 * row component can read the latest snapshot through `useStore` without
 * touching the settings transport on every render. The plugin's apply-world
 * effect writes into this store when the bound scope revises; the only writer.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import type { BgSource } from '../bg-settings.ts'

/**
 * Row-local mirror state. `revision` starts at -1 so the first durable
 * revision (0 or higher) is always treated as a real change, and unchanged
 * snapshots are dropped on the floor by the actions guard.
 */
export interface BgRowState {
  frame: BgSource
  hero: BgSource
  revision: number
}

/** Declared action shape giving the exported factory a stable return type. */
type BgRowActions = {
  sync: (draft: BgRowState, next: { frame: BgSource; hero: BgSource }, revision: number) => void
}

/**
 * Declares the bg row state and write surface. Two independent sources
 * (`frame`, `hero`) tracked in a single store so one effect drives both
 * row adapters.
 * @returns the store handle.
 */
export function createBgRowStore(): EngineStoreHandle<BgRowState, BgRowActions> {
  return defineStore({
    init: (): BgRowState => ({
      frame: { kind: 'none' },
      hero: { kind: 'none' },
      revision: -1,
    }),
    actions: {
      sync: (draft, next, revision) => {
        if (revision <= draft.revision) return
        draft.frame = next.frame
        draft.hero = next.hero
        draft.revision = revision
      },
    },
  })
}
