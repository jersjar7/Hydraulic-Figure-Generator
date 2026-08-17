import { CheckCheck, FileOutput, Images, Layers3, X } from 'lucide-react'
import { ControlSection } from '../../components/ControlSection'
import type { HydraulicEngine } from '../../core/hydraulicEngine'
import { runDisplayName } from '../../core/hydraulicEngine'
import type { ConditionData } from '../../core/types'
import type { usePlanViewFigureSet } from './usePlanViewFigureSet'
import { planViewGeometryOutputOptions } from '../../core/hydraulics/planViewGeometryResults'

type Props = {
  engine: HydraulicEngine
  scenarios: ConditionData[]
  controller: ReturnType<typeof usePlanViewFigureSet>
  includedCount: number
  addingToExport: boolean
  exportProgress: { completed: number; total: number }
  onAddToExport(): void
  onCancelAddToExport(): void
  onQuickWordExport(): void
}

export function PlanViewFigureSetPanel({
  engine,
  scenarios,
  controller,
  includedCount,
  addingToExport,
  exportProgress,
  onAddToExport,
  onCancelAddToExport,
  onQuickWordExport,
}: Props) {
  const activeId = controller.activeScenarioId
  const activeScenario = scenarios.find((scenario) => scenario.key === activeId)
  const runs = activeScenario ? engine.runOptions(activeId) : []
  const selectedRuns = controller.scope.runIndicesByScenario[activeId] ?? []
  const resultMap = new Map([
    ...planViewGeometryOutputOptions(activeScenario).map((result) => [
      result.paramName,
      result,
    ] as const),
    ...selectedRuns.flatMap((runIndex) =>
      engine.scalarResultOptions(activeId, runIndex).map((result) => [
        result.paramName,
        { ...result, kind: 'scalar' as const, runDependent: true },
      ] as const),
    ),
  ])
  const selectedResults =
    controller.scope.resultParametersByScenario[activeId] ?? []

  return (
    <ControlSection>
      <label className="field">
        <span>Figure set name</span>
        <input
          value={controller.figureSet.name}
          onChange={(event) => controller.setName(event.currentTarget.value)}
        />
      </label>

      <div className="figure-set-control-group">
        <div className="compact-section-heading">Scenarios</div>
        <div className="selection-checklist">
          {scenarios.length === 0 ? (
            <p className="empty-control-copy">
              Load SMS geometry and datasets in Models first. Batch Figures will
              then create every selected scenario, run, and result combination.
            </p>
          ) : scenarios.map((scenario) => {
            const selected = controller.scope.scenarioIds.includes(scenario.key)
            return (
              <label className="selection-choice" key={scenario.key}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) =>
                    controller.toggleScenario(scenario.key, event.currentTarget.checked)
                  }
                />
                <span>
                  <strong>{scenario.label}</strong>
                  <small>{engine.runOptions(scenario.key).length} runs</small>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {controller.scope.scenarioIds.length > 0 ? (
        <>
          <label className="field">
            <span>Configure scenario</span>
            <select
              value={activeId}
              onChange={(event) =>
                controller.setActiveScenarioId(event.currentTarget.value)
              }
            >
              {controller.scope.scenarioIds.map((scenarioId) => (
                <option value={scenarioId} key={scenarioId}>
                  {engine.condition(scenarioId)?.label ?? scenarioId}
                </option>
              ))}
            </select>
          </label>

          <div className="figure-set-control-group">
            <div className="compact-section-heading">
              <span>Runs</span>
              <span className="checklist-heading-actions">
                <button
                  type="button"
                  title="Select all runs"
                  aria-label="Select all runs"
                  onClick={() => controller.selectAllRuns(activeId, true)}
                ><CheckCheck size={13} /></button>
                <button
                  type="button"
                  title="Clear runs"
                  aria-label="Clear runs"
                  onClick={() => controller.selectAllRuns(activeId, false)}
                ><X size={13} /></button>
              </span>
            </div>
            <div className="selection-checklist dense">
              {runs.map((run, index) => (
                <label className="selection-choice" key={run.run.name}>
                  <input
                    type="checkbox"
                    checked={selectedRuns.includes(index)}
                    onChange={() => controller.toggleRun(activeId, index)}
                  />
                  <span><strong>{runDisplayName(run.run.name)}</strong></span>
                </label>
              ))}
            </div>
          </div>

          <div className="figure-set-control-group">
            <div className="compact-section-heading">
              <span>Results</span>
              <span className="checklist-heading-actions">
                <button
                  type="button"
                  title="Select all results"
                  aria-label="Select all results"
                  onClick={() => controller.selectAllResults(activeId, true)}
                ><CheckCheck size={13} /></button>
                <button
                  type="button"
                  title="Clear results"
                  aria-label="Clear results"
                  onClick={() => controller.selectAllResults(activeId, false)}
                ><X size={13} /></button>
              </span>
            </div>
            <div className="selection-checklist dense">
              {[...resultMap.values()].map((result) => (
                <label className="selection-choice" key={result.paramName}>
                  <input
                    type="checkbox"
                    checked={selectedResults.includes(result.paramName)}
                    onChange={() =>
                      controller.toggleResult(activeId, result.paramName)
                    }
                  />
                  <span>
                    <strong>{result.label}</strong>
                    <small>
                      {result.runDependent
                        ? result.units || 'dimensionless'
                        : 'geometry output'}
                    </small>
                  </span>
                </label>
              ))}
              {resultMap.size === 0 ? (
                <p className="empty-control-copy">Add scenario geometry.</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <div className="figure-set-count" aria-live="polite">
        <Layers3 size={17} aria-hidden="true" />
        <div>
          <strong>
            {controller.draftCount} figure{controller.draftCount === 1 ? '' : 's'} selected
          </strong>
          <span>Valid run and result combinations</span>
        </div>
      </div>

      <div className="batch-export-actions">
        <button
          className={`button ${addingToExport ? 'secondary' : 'primary'} full`}
          type="button"
          disabled={includedCount === 0 && !addingToExport}
          onClick={addingToExport ? onCancelAddToExport : onAddToExport}
        >
          {addingToExport ? <X size={16} /> : <Images size={16} />}
          {addingToExport
            ? `Cancel (${exportProgress.completed}/${exportProgress.total})`
            : `Add included to Export Collection (${includedCount})`}
        </button>
        <button
          className="button secondary full"
          type="button"
          disabled={includedCount === 0 || addingToExport}
          onClick={onQuickWordExport}
        >
          <FileOutput size={16} aria-hidden="true" />
          Quick Word Export
        </button>
        <small>
          Export Collection assembles figures from every workspace. Quick Word
          Export creates a Plan-View-only document.
        </small>
      </div>
    </ControlSection>
  )
}
