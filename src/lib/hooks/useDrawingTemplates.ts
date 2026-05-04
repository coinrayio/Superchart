/**
 * useDrawingTemplates — shared hook for the three overlay UIs that surface
 * drawing templates (floating settings popup, overlay settings modal,
 * right-click context menu).
 *
 * Responsibilities:
 *   - Decide whether the templates UI should render at all (feature flag +
 *     adapter capability check).
 *   - Load and refresh the per-tool template list.
 *   - Apply / save / delete templates against the active StorageAdapter.
 *
 * Centralizing this avoids three subtly different implementations of the
 * same thing.
 */

import { useCallback, useEffect, useState } from 'react'
import { useChartStore } from '../store/chartStoreContext'
import { useFeature } from '../features/useFeature'
import type { DrawingTemplate, DrawingTemplateMeta } from '../types/storage'
import type { ProOverlay, OverlayProperties } from '../types/overlay'
import type { DeepPartial } from 'klinecharts'

export interface UseDrawingTemplatesResult {
  /** True when the controls should be visible. */
  enabled: boolean
  /** Per-tool template list (system + user, system first). Empty until loaded. */
  list: DrawingTemplateMeta[]
  /** Last error message from a load/save/delete call, or null. */
  error: string | null
  /** Force a re-fetch of the list. */
  refresh: () => Promise<void>
  /**
   * Apply a template by name: pushes properties through the existing
   * modify-properties path and any figureStyles via overrideOverlay.
   */
  apply: (templateName: string) => Promise<void>
  /**
   * Persist the supplied properties (typically the overlay's current
   * snapshot) under a new user template. Throws on system-name collisions.
   */
  save: (templateName: string, properties: DeepPartial<OverlayProperties>) => Promise<void>
  /** Delete a user template. System templates cannot be deleted. */
  remove: (templateName: string) => Promise<void>
}

export function useDrawingTemplates(
  overlay: ProOverlay | null | undefined,
  applyProperties: (props: DeepPartial<OverlayProperties>) => void,
): UseDrawingTemplatesResult {
  const store = useChartStore()
  const featureOn = useFeature('drawing_templates')
  const adapter = store.storageAdapter()
  const adapterCapable =
    !!adapter &&
    typeof adapter.listDrawingTemplates === 'function' &&
    typeof adapter.loadDrawingTemplate === 'function' &&
    typeof adapter.saveDrawingTemplate === 'function'

  const enabled = featureOn && adapterCapable && !!overlay

  const [list, setList] = useState<DrawingTemplateMeta[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled || !adapter?.listDrawingTemplates || !overlay?.name) return
    try {
      const next = await adapter.listDrawingTemplates(overlay.name)
      setList(next)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [enabled, adapter, overlay?.name])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const apply = useCallback(
    async (templateName: string) => {
      if (!overlay || !adapter?.loadDrawingTemplate) return
      try {
        const tpl = await adapter.loadDrawingTemplate(overlay.name, templateName)
        if (!tpl) {
          setError('Template not found')
          return
        }
        if (tpl.properties && Object.keys(tpl.properties).length > 0) {
          applyProperties(tpl.properties as DeepPartial<OverlayProperties>)
        }
        if (tpl.figureStyles && Object.keys(tpl.figureStyles).length > 0) {
          store.instanceApi()?.overrideOverlay({ id: overlay.id, figureStyles: tpl.figureStyles })
        }
        // Remember the applied template name on the overlay so the settings
        // modal (and any other UI) can show which template the overlay was
        // last derived from. Persisted via extendData.
        const existingExt = (overlay as { extendData?: Record<string, unknown> }).extendData ?? {}
        store.instanceApi()?.overrideOverlay({
          id: overlay.id,
          extendData: { ...existingExt, templateName },
        })
        setError(null)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [overlay, adapter, applyProperties, store],
  )

  const save = useCallback(
    async (templateName: string, properties: DeepPartial<OverlayProperties>) => {
      if (!overlay || !adapter?.saveDrawingTemplate) return
      try {
        const body: DrawingTemplate = {
          name: templateName,
          toolName: overlay.name,
          properties: properties as Record<string, unknown>,
        }
        await adapter.saveDrawingTemplate(overlay.name, templateName, body)
        await refresh()
        setError(null)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [overlay, adapter, refresh],
  )

  const remove = useCallback(
    async (templateName: string) => {
      if (!overlay || !adapter?.deleteDrawingTemplate) return
      const meta = list.find(t => t.name === templateName)
      if (meta?.system) {
        setError('Cannot delete system template')
        return
      }
      try {
        await adapter.deleteDrawingTemplate(overlay.name, templateName)
        await refresh()
        setError(null)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [overlay, adapter, list, refresh],
  )

  return { enabled, list, error, refresh, apply, save, remove }
}
