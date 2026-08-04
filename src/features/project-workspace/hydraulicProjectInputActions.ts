import type {
  Dispatch,
  SetStateAction,
} from 'react'
import { importHydraulicFiles } from '../../application/importHydraulicFiles'
import { importOverlayArchives } from '../../application/importOverlayArchives'
import type {
  ConditionKey,
  IngestNotice,
  MapOverlay,
  ScenarioRole,
} from '../../core/types'
import { shapefileArchivePort } from '../../infrastructure/shapefiles/shapefileArchivePort'

type Options = {
  assessmentId: ConditionKey
  overlays: MapOverlay[]
  ingest: (files: File[]) => Promise<IngestNotice[]>
  removeCondition: (key: ConditionKey) => void
  renameCondition: (key: ConditionKey, label: string) => void
  changeRole: (role: ScenarioRole, key: ConditionKey) => void
  changeRun: (key: ConditionKey, index: number) => void
  setOverlays: Dispatch<SetStateAction<MapOverlay[]>>
  onFilesChanged(): void
  onSelectionChanged(): void
  onAssessmentSourceChanged(): void
  setBusy(busy: boolean): void
  appendNotices(notices: IngestNotice[]): void
}

export function createHydraulicProjectInputActions({
  assessmentId,
  overlays,
  ingest,
  removeCondition,
  renameCondition,
  changeRole,
  changeRun,
  setOverlays,
  onFilesChanged,
  onSelectionChanged,
  onAssessmentSourceChanged,
  setBusy,
  appendNotices,
}: Options) {
  const handleH5Files = async (files: File[]) => {
    setBusy(true)
    onFilesChanged()
    try {
      appendNotices(await importHydraulicFiles(files, { ingest }))
    } finally {
      setBusy(false)
    }
  }

  const handleOverlayFiles = async (files: File[]) => {
    setBusy(true)
    try {
      const result = await importOverlayArchives(
        files,
        overlays.length,
        shapefileArchivePort,
      )
      setOverlays((current) => [...current, ...result.overlays])
      appendNotices(result.notices)
    } finally {
      setBusy(false)
    }
  }

  const removeHydraulicCondition = (key: ConditionKey) => {
    removeCondition(key)
    onSelectionChanged()
    if (key === assessmentId) onAssessmentSourceChanged()
  }

  const changeScenarioRole = (role: ScenarioRole, key: ConditionKey) => {
    changeRole(role, key)
    onSelectionChanged()
    if (role === 'assessment') onAssessmentSourceChanged()
  }

  const changeScenarioRun = (key: ConditionKey, index: number) => {
    changeRun(key, index)
    onSelectionChanged()
    if (key === assessmentId) onAssessmentSourceChanged()
  }

  const updateOverlay = (id: string, patch: Partial<MapOverlay>) => {
    setOverlays((current) =>
      current.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
    )
  }

  const removeOverlay = (id: string) => {
    setOverlays((current) =>
      current.filter((overlay) => overlay.id !== id),
    )
  }

  return {
    handleH5Files,
    handleOverlayFiles,
    removeHydraulicCondition,
    renameHydraulicCondition: renameCondition,
    changeScenarioRole,
    changeScenarioRun,
    updateOverlay,
    removeOverlay,
  }
}
