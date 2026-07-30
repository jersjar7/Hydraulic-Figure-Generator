import type {
  Dispatch,
  SetStateAction,
} from 'react'
import { importHydraulicFiles } from '../../application/importHydraulicFiles'
import { importOverlayArchives } from '../../application/importOverlayArchives'
import type {
  ConditionKey,
  FigureSettings,
  IngestNotice,
  MapOverlay,
  ScenarioRole,
  WseDifferenceScene,
} from '../../core/types'
import { shapefileArchivePort } from '../../infrastructure/shapefiles/shapefileArchivePort'

type WseProjectInputsOptions = {
  assessmentId: ConditionKey
  settings: FigureSettings
  overlays: MapOverlay[]
  ingest: (files: File[]) => Promise<IngestNotice[]>
  removeCondition: (key: ConditionKey) => void
  renameCondition: (key: ConditionKey, label: string) => void
  changeRole: (role: ScenarioRole, key: ConditionKey) => void
  changeRun: (key: ConditionKey, index: number) => void
  setOverlays: Dispatch<SetStateAction<MapOverlay[]>>
  setScene: Dispatch<SetStateAction<WseDifferenceScene | null>>
  invalidateAssessment: (interval: number) => void
  clearAssessment: (interval: number) => void
  setBusy: (busy: boolean) => void
  appendNotices: (notices: IngestNotice[]) => void
}

export function useWseProjectInputs({
  assessmentId,
  settings,
  overlays,
  ingest,
  removeCondition,
  renameCondition,
  changeRole,
  changeRun,
  setOverlays,
  setScene,
  invalidateAssessment,
  clearAssessment,
  setBusy,
  appendNotices,
}: WseProjectInputsOptions) {
  const handleH5Files = async (files: File[]) => {
    setBusy(true)
    setScene(null)
    invalidateAssessment(settings.assessmentLineInterval)
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
    setScene(null)
    if (key === assessmentId) {
      clearAssessment(settings.assessmentLineInterval)
    }
  }

  const changeScenarioRole = (role: ScenarioRole, key: ConditionKey) => {
    setScene(null)
    changeRole(role, key)
    if (role === 'assessment') {
      clearAssessment(settings.assessmentLineInterval)
    }
  }

  const changeScenarioRun = (key: ConditionKey, index: number) => {
    changeRun(key, index)
    setScene(null)
    if (key === assessmentId) {
      clearAssessment(settings.assessmentLineInterval)
    }
  }

  const updateOverlay = (id: string, patch: Partial<MapOverlay>) => {
    setOverlays((current) =>
      current.map((overlay) =>
        overlay.id === id ? { ...overlay, ...patch } : overlay,
      ),
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
  }
}
