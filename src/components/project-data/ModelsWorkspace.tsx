import { RefreshCcw, Trash2, UploadCloud } from 'lucide-react'
import { runDisplayName } from '../../core/hydraulicEngine'
import type {
  ConditionData,
  ConditionKey,
  RunSelection,
  ScenarioRole,
} from '../../core/types'
import { FileDrop } from '../FileDrop'
import type { ScenarioRoleOption } from './projectWorkflowTypes'
import type { HydraulicInputReference } from '../../features/project-lifecycle/workspaceSessionProjectFile'

type ModelsWorkspaceProps = {
  busy: boolean
  scenarios: ConditionData[]
  missingInputReferences?: readonly HydraulicInputReference[]
  scenarioRoles?: readonly ScenarioRoleOption[]
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

const DEFAULT_SCENARIO_ROLES: readonly ScenarioRoleOption[] = [
  { role: 'baseline', label: 'Baseline', required: true },
  { role: 'comparison', label: 'Comparison', required: true },
  { role: 'assessment', label: 'Assessment-line source', required: false },
]

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
  missingInputReferences = [],
  scenarioRoles,
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
  const roles = scenarioRoles ?? DEFAULT_SCENARIO_ROLES
  const roleKey = (role: ScenarioRole) => {
    if (role === 'baseline') return baselineId
    if (role === 'comparison') return comparisonId
    return assessmentId
  }
  const selectedScenarioKeys = [...new Set(roles.map(({ role }) => roleKey(role)))]
  const visibleRoleSet = new Set(roles.map(({ role }) => role))

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
        {missingInputReferences.length > 0 ? (
          <div className="input-recovery-note" role="status">
            <strong>Re-add local H5 files</strong>
            <span>Project settings were restored. Source files stay outside the project folder.</span>
            <ul>
              {missingInputReferences.map((input) => (
                <li key={input.scenarioKey}>
                  {input.scenarioLabel}: {[
                    input.geometryFileName,
                    input.datasetFileName,
                  ].filter(Boolean).join(' + ') || 'geometry + datasets'}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
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
        {roles.map(({ role, label }) => (
          <ScenarioSelect
            key={role}
            label={label}
            value={roleKey(role)}
            scenarios={scenarios}
            disabledKey={
              role === 'baseline'
                ? visibleRoleSet.has('comparison') ? comparisonId : undefined
                : role === 'comparison'
                  ? visibleRoleSet.has('baseline') ? baselineId : undefined
                  : undefined
            }
            onChange={(key) => onRoleChange(role, key)}
          />
        ))}
      </section>

      <section className="workflow-block">
        <div className="block-title">
          <RefreshCcw size={17} aria-hidden="true" />
          <span>Selected runs</span>
        </div>
        {selectedScenarioKeys.map((key) => {
          const scenario = scenarios.find((item) => item.key === key)
          return (
            <RunSelect
              key={key}
              label={`${scenario?.label ?? 'Scenario'} run`}
              scenario={scenario}
              runs={runsFor(key)}
              value={runByScenario[key] ?? 0}
              onChange={(index) => onRunChange(key, index)}
            />
          )
        })}
      </section>
    </>
  )
}
