import { RefreshCcw, Trash2, UploadCloud } from 'lucide-react'
import { runDisplayName } from '../../core/hydraulicEngine'
import type {
  ConditionData,
  ConditionKey,
  RunSelection,
  ScenarioRole,
} from '../../core/types'
import { FileDrop } from '../FileDrop'

type ModelsWorkspaceProps = {
  busy: boolean
  scenarios: ConditionData[]
  baselineId: ConditionKey
  comparisonId: ConditionKey
  assessmentId: ConditionKey
  runByScenario: Record<ConditionKey, number>
  onH5Files(files: File[]): void
  onRemoveCondition(key: ConditionKey): void
  onRenameCondition(key: ConditionKey, label: string): void
  onRoleChange(role: ScenarioRole, key: ConditionKey): void
  onRunChange(key: ConditionKey, index: number): void
  runsFor(key: ConditionKey): RunSelection[]
}

function complete(condition: ConditionData) {
  return Boolean(
    condition.geometryFileName &&
      condition.datasetFileName &&
      condition.projected &&
      condition.datasets,
  )
}

function ConditionStatus({
  condition,
  onRemove,
  onRename,
}: {
  condition: ConditionData
  onRemove(): void
  onRename(label: string): void
}) {
  const geometryName = condition.geometryFileName
  const datasetName = condition.datasetFileName
  return (
    <div className={`condition-row${complete(condition) ? ' complete' : ''}`}>
      <div className="condition-name">
        <span className={`condition-code ${condition.kind}`}>
          {condition.key.slice(0, 3)}
        </span>
        <input
          key={`${condition.key}:${condition.label}`}
          className="condition-label-input"
          aria-label={`${condition.key} scenario name`}
          defaultValue={condition.label}
          onBlur={(event) => onRename(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
        <button
          className="icon-button tiny danger condition-remove"
          type="button"
          title={`Remove ${condition.label} inputs`}
          aria-label={`Remove ${condition.label} inputs`}
          onClick={onRemove}
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
      <div className="condition-badges">
        <span
          className={geometryName ? 'status-badge ready' : 'status-badge'}
          title={geometryName}
        >
          {geometryName
            ? `${condition.projected?.N.toLocaleString()} nodes`
            : 'geometry'}
        </span>
        <span
          className={datasetName ? 'status-badge ready' : 'status-badge'}
          title={datasetName}
        >
          {datasetName ? `${condition.datasets?.runs.length} runs` : 'datasets'}
        </span>
      </div>
    </div>
  )
}

function ScenarioSelect({
  label,
  value,
  scenarios,
  disabledKey,
  onChange,
}: {
  label: string
  value: ConditionKey
  scenarios: ConditionData[]
  disabledKey?: ConditionKey
  onChange(key: ConditionKey): void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        disabled={scenarios.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {scenarios.length === 0 ? (
          <option value="">Waiting for scenarios</option>
        ) : (
          scenarios.map((scenario) => (
            <option
              key={scenario.key}
              value={scenario.key}
              disabled={scenario.key === disabledKey}
            >
              {scenario.label}
            </option>
          ))
        )}
      </select>
    </label>
  )
}

function RunSelect({
  label,
  scenario,
  runs,
  value,
  onChange,
}: {
  label: string
  scenario?: ConditionData
  runs: RunSelection[]
  value: number
  onChange(index: number): void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        disabled={runs.length === 0}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {runs.length === 0 ? (
          <option value={0}>
            Waiting for {scenario?.label ?? 'scenario'} files
          </option>
        ) : (
          runs.map((selection) => (
            <option key={selection.index} value={selection.index}>
              {runDisplayName(selection.run.name)}
            </option>
          ))
        )}
      </select>
    </label>
  )
}

export function ModelsWorkspace({
  busy,
  scenarios,
  baselineId,
  comparisonId,
  assessmentId,
  runByScenario,
  onH5Files,
  onRemoveCondition,
  onRenameCondition,
  onRoleChange,
  onRunChange,
  runsFor,
}: ModelsWorkspaceProps) {
  const baseline = scenarios.find((scenario) => scenario.key === baselineId)
  const comparison = scenarios.find(
    (scenario) => scenario.key === comparisonId,
  )
  const assessment = scenarios.find(
    (scenario) => scenario.key === assessmentId,
  )

  return (
    <>
      <section className="workflow-block">
        <div className="block-title">
          <UploadCloud size={17} aria-hidden="true" />
          <span>SMS scenarios</span>
          <span className="file-chip">.h5</span>
        </div>
        <FileDrop
          accept=".h5"
          title="Add scenario geometry + datasets"
          description="Natural, Existing, Proposed, or alternatives"
          disabled={busy}
          testId="h5-file-drop"
          onFiles={onH5Files}
        />
        <div className="condition-list">
          {scenarios.length === 0 ? (
            <p className="empty-note">No hydraulic scenarios loaded.</p>
          ) : (
            scenarios.map((scenario) => (
              <ConditionStatus
                key={scenario.key}
                condition={scenario}
                onRemove={() => onRemoveCondition(scenario.key)}
                onRename={(label) => onRenameCondition(scenario.key, label)}
              />
            ))
          )}
        </div>
      </section>

      <section className="workflow-block">
        <div className="block-title">
          <RefreshCcw size={17} aria-hidden="true" />
          <span>Figure roles</span>
        </div>
        <ScenarioSelect
          label="Baseline"
          value={baselineId}
          scenarios={scenarios}
          disabledKey={comparisonId}
          onChange={(key) => onRoleChange('baseline', key)}
        />
        <ScenarioSelect
          label="Comparison"
          value={comparisonId}
          scenarios={scenarios}
          disabledKey={baselineId}
          onChange={(key) => onRoleChange('comparison', key)}
        />
        <ScenarioSelect
          label="Assessment-line source"
          value={assessmentId}
          scenarios={scenarios}
          onChange={(key) => onRoleChange('assessment', key)}
        />
      </section>

      <section className="workflow-block">
        <div className="block-title">
          <RefreshCcw size={17} aria-hidden="true" />
          <span>Selected runs</span>
        </div>
        <RunSelect
          label={`${baseline?.label ?? 'Baseline'} run`}
          scenario={baseline}
          runs={runsFor(baselineId)}
          value={runByScenario[baselineId] ?? 0}
          onChange={(index) => onRunChange(baselineId, index)}
        />
        <RunSelect
          label={`${comparison?.label ?? 'Comparison'} run`}
          scenario={comparison}
          runs={runsFor(comparisonId)}
          value={runByScenario[comparisonId] ?? 0}
          onChange={(index) => onRunChange(comparisonId, index)}
        />
        {assessmentId !== baselineId && assessmentId !== comparisonId ? (
          <RunSelect
            label={`${assessment?.label ?? 'Assessment'} run`}
            scenario={assessment}
            runs={runsFor(assessmentId)}
            value={runByScenario[assessmentId] ?? 0}
            onChange={(index) => onRunChange(assessmentId, index)}
          />
        ) : null}
      </section>
    </>
  )
}
