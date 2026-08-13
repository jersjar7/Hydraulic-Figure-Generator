import path from 'node:path'

export type ArchitectureSourceFile = {
  relativeFile: string
  source: string
}

const SOURCE_MAX_LINES = 600
const WORKSPACE_MAX_LINES = 500
export const WORKSPACE_COMPOSITION_CEILINGS: Readonly<Record<string, number>> = {
  'src/features/report-assembly/ReportAssemblyWorkspace.tsx': 200,
  'src/features/hydraulic-profiles/HydraulicProfilesWorkspace.tsx': 300,
  'src/features/cross-section/CrossSectionWorkspace.tsx': 350,
  'src/features/plan-view-results/PlanViewResultWorkspace.tsx': 400,
  'src/features/wse-difference/WseDifferenceWorkspace.tsx': 400,
}
const LAYER_RULES: Record<string, Set<string>> = {
  core: new Set(['core']),
  application: new Set(['application', 'core']),
  infrastructure: new Set(['infrastructure', 'application', 'core']),
}
const IMPORT_PATTERN =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g

type OwnershipRule = {
  file: string
  forbidden: RegExp
  message: string
}

const OWNERSHIP_RULES: readonly OwnershipRule[] = [
  {
    file: 'src/features/cross-section/CrossSectionWorkspace.tsx',
    forbidden: /createCrossSectionReportFigure|createHydraulicProjectInputActions|downloadCrossSectionPng|useCrossSectionDraftRetention/,
    message: 'Cross-Section lifecycle and output policies belong to feature controllers',
  },
  {
    file: 'src/features/hydraulic-profiles/HydraulicProfilesWorkspace.tsx',
    forbidden: /buildHydraulicProfileDataset|buildHydraulicLongitudinalScene|parseSms(?:ProfileValues|SummaryTable)|createWorkspaceDraftSnapshot|createHydraulic(?:Longitudinal|Profile)ReportFigure|downloadHydraulic(?:Longitudinal|Profile)Png|renderHydraulicLongitudinalDocument|hydraulicProfileFigure\.buildScene/,
    message: 'profile analysis, generation, rendering, and output policies belong to feature controllers',
  },
  {
    file: 'src/features/plan-view-results/PlanViewResultWorkspace.tsx',
    forbidden: /createHydraulicProjectInputActions|createCanvasReportFigure|exportPlanViewResult|planViewResultFigure\.buildScene|usePlanViewWorkspacePersistence|withPlanView(?:Cartography|Output)Settings/,
    message: 'Plan-View lifecycle, output, generation, and settings policies belong to feature controllers',
  },
  {
    file: 'src/features/wse-difference/WseDifferenceWorkspace.tsx',
    forbidden: /createHydraulicProjectInputActions|createWse(?:MapExportAction|ProjectPersistenceController|ReportFigure|StationingSourceActions)|useAssessmentMapLayers|useAssessmentWorkflow|useCenterlineStationingSource|useWseDraftRetention|useWseMapInteractions|withWseCartographySettings/,
    message: 'WSE lifecycle, assessment, interactions, output, and settings policies belong to feature controllers',
  },
]

function normalized(file: string) {
  return file.replaceAll('\\', '/')
}

function sourceLayer(relativeFile: string) {
  return normalized(relativeFile).split('/')[1] ?? ''
}

function importedLayer(relativeFile: string, specifier: string) {
  if (!specifier.startsWith('.')) return null
  const sourceDirectory = path.posix.dirname(normalized(relativeFile))
  const resolved = path.posix.normalize(path.posix.join(sourceDirectory, specifier))
  if (!resolved.startsWith('src/')) return null
  return resolved.split('/')[1] ?? null
}

export function evaluateArchitectureFile({
  relativeFile: rawFile,
  source,
}: ArchitectureSourceFile) {
  const relativeFile = normalized(rawFile)
  const violations: string[] = []
  const lineCount = source.split(/\r?\n/).length
  const workspace = relativeFile.endsWith('Workspace.tsx')
  if (lineCount > SOURCE_MAX_LINES) {
    violations.push(
      `${relativeFile}: ${lineCount} lines exceeds the ${SOURCE_MAX_LINES}-line source ceiling`,
    )
  }
  if (workspace && lineCount > WORKSPACE_MAX_LINES) {
    violations.push(
      `${relativeFile}: ${lineCount} lines exceeds the ${WORKSPACE_MAX_LINES}-line workspace ceiling`,
    )
  }
  const featureWorkspace =
    workspace && relativeFile.startsWith('src/features/')
  const workspaceCeiling = WORKSPACE_COMPOSITION_CEILINGS[relativeFile]
  if (featureWorkspace && !workspaceCeiling) {
    violations.push(
      `${relativeFile}: feature workspaces must declare an explicit composition ceiling`,
    )
  }
  if (workspaceCeiling && lineCount > workspaceCeiling) {
    violations.push(
      `${relativeFile}: ${lineCount} lines exceeds its ${workspaceCeiling}-line composition ceiling`,
    )
  }

  const layer = sourceLayer(relativeFile)
  if (
    (layer === 'core' || layer === 'application') &&
    /from\s+['"](?:react|react-dom)(?:\/[^'"]*)?['"]/.test(source)
  ) {
    violations.push(`${relativeFile}: ${layer} must remain independent of React`)
  }
  if (
    workspace &&
    /from\s+['"][^'"]*infrastructure(?:\/|['"])/.test(source)
  ) {
    violations.push(
      `${relativeFile}: workspaces must call feature/application adapters instead of infrastructure directly`,
    )
  }
  if (
    workspace &&
    /from\s+['"][^'"]*(?:FigurePicker|ExportCollectionButton|ProjectCommandBar)['"]/.test(source)
  ) {
    violations.push(
      `${relativeFile}: global header navigation belongs to App.tsx, not a figure workspace`,
    )
  }
  if (
    workspace &&
    /\bon(?:Save|Load|New)=|ProjectSaveStatus|use(?:CrossSection|PlanViewResult)ProjectFiles/.test(source)
  ) {
    violations.push(
      `${relativeFile}: project New, Save, and Open commands belong to the global project command bar`,
    )
  }

  const ownership = OWNERSHIP_RULES.find((rule) => rule.file === relativeFile)
  if (ownership?.forbidden.test(source)) {
    violations.push(`${relativeFile}: ${ownership.message}`)
  }

  const allowedLayers = LAYER_RULES[layer]
  if (allowedLayers) {
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const dependencyLayer = importedLayer(relativeFile, match[1])
      if (dependencyLayer && !allowedLayers.has(dependencyLayer)) {
        violations.push(
          `${relativeFile}: ${layer} cannot import from ${dependencyLayer} (${match[1]})`,
        )
      }
    }
  }
  return violations
}

export function evaluateArchitecture(files: ArchitectureSourceFile[]) {
  return files.flatMap(evaluateArchitectureFile)
}
