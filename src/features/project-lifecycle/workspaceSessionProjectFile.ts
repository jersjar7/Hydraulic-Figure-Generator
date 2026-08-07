import type { ReportFigureEditTargets } from '../../application/report-assembly/reportFigureEditSession'
import type { WorkspaceDraftSnapshot } from '../../core/types'

export const WORKSPACE_SESSION_PROJECT_VERSION = 1

export type HydraulicInputReference = Readonly<{
  scenarioKey: string
  scenarioLabel: string
  geometryFileName: string
  datasetFileName: string
}>

export type WorkspaceSessionProjectState = Readonly<{
  drafts: readonly WorkspaceDraftSnapshot[]
  reportFigureEditTargets: ReportFigureEditTargets
  hydraulicInputs: readonly HydraulicInputReference[]
}>

type WorkspaceSessionEnvelope = WorkspaceSessionProjectState & {
  version: typeof WORKSPACE_SESSION_PROJECT_VERSION
}

export function createWorkspaceSessionProjectState(): WorkspaceSessionProjectState {
  return {
    drafts: [],
    reportFigureEditTargets: {},
    hydraulicInputs: [],
  }
}

export function serializeWorkspaceSessionProject(
  state: WorkspaceSessionProjectState,
) {
  const envelope: WorkspaceSessionEnvelope = {
    version: WORKSPACE_SESSION_PROJECT_VERSION,
    ...state,
  }
  return JSON.stringify(envelope, null, 2)
}

function parseDraft(value: unknown): WorkspaceDraftSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('A saved workspace draft is malformed.')
  }
  const draft = value as Partial<WorkspaceDraftSnapshot>
  if (
    typeof draft.workspaceId !== 'string' || !draft.workspaceId.trim() ||
    !Number.isInteger(draft.schemaVersion) || Number(draft.schemaVersion) < 1 ||
    typeof draft.source !== 'string'
  ) throw new Error('A saved workspace draft is malformed.')
  return {
    workspaceId: draft.workspaceId,
    schemaVersion: Number(draft.schemaVersion),
    source: draft.source,
  }
}

function parseEditTargets(value: unknown): ReportFigureEditTargets {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Saved export edit relationships are malformed.')
  }
  if (!Object.entries(value).every(([workspaceId, figureId]) =>
    workspaceId.trim() && typeof figureId === 'string' && figureId.trim(),
  )) throw new Error('Saved export edit relationships are malformed.')
  return { ...(value as Record<string, string>) }
}

function parseHydraulicInput(value: unknown): HydraulicInputReference {
  if (!value || typeof value !== 'object') {
    throw new Error('A saved hydraulic input reference is malformed.')
  }
  const input = value as Partial<HydraulicInputReference>
  if (
    typeof input.scenarioKey !== 'string' || !input.scenarioKey.trim() ||
    typeof input.scenarioLabel !== 'string' || !input.scenarioLabel.trim() ||
    typeof input.geometryFileName !== 'string' ||
    typeof input.datasetFileName !== 'string'
  ) throw new Error('A saved hydraulic input reference is malformed.')
  return {
    scenarioKey: input.scenarioKey,
    scenarioLabel: input.scenarioLabel,
    geometryFileName: input.geometryFileName,
    datasetFileName: input.datasetFileName,
  }
}

export function parseWorkspaceSessionProject(
  source: string,
): WorkspaceSessionProjectState {
  const parsed = JSON.parse(source) as Partial<WorkspaceSessionEnvelope>
  if (parsed.version !== WORKSPACE_SESSION_PROJECT_VERSION) {
    throw new Error(
      `Workspace session version ${String(parsed.version)} is not supported.`,
    )
  }
  if (!Array.isArray(parsed.drafts) || !Array.isArray(parsed.hydraulicInputs)) {
    throw new Error('The saved workspace session is malformed.')
  }
  const drafts = parsed.drafts.map(parseDraft)
  const hydraulicInputs = parsed.hydraulicInputs.map(parseHydraulicInput)
  if (new Set(drafts.map((draft) => draft.workspaceId)).size !== drafts.length) {
    throw new Error('Saved workspace drafts must have unique workspace IDs.')
  }
  if (
    new Set(hydraulicInputs.map((input) => input.scenarioKey)).size !==
    hydraulicInputs.length
  ) throw new Error('Saved hydraulic inputs must have unique scenario IDs.')
  return {
    drafts,
    reportFigureEditTargets: parseEditTargets(parsed.reportFigureEditTargets),
    hydraulicInputs,
  }
}
