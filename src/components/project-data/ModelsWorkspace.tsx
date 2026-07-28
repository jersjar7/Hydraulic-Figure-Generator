import { RefreshCcw, Trash2, UploadCloud } from 'lucide-react'
import { runDisplayName } from '../../core/hydraulicEngine'
import type {
  ConditionData,
  ConditionKey,
  RunSelection,
} from '../../core/types'
import { FileDrop } from '../FileDrop'

type ModelsWorkspaceProps = {
  busy: boolean
  existingCondition?: ConditionData
  proposedCondition?: ConditionData
  existingRuns: RunSelection[]
  proposedRuns: RunSelection[]
  existingRun: number
  proposedRun: number
  onH5Files(files: File[]): void
  onRemoveCondition(key: ConditionKey): void
  onExistingRunChange(index: number): void
  onProposedRunChange(index: number): void
}

function ConditionStatus({
  label,
  conditionKey,
  condition,
  onRemove,
}: {
  label: string
  conditionKey: ConditionKey
  condition?: ConditionData
  onRemove(): void
}) {
  const geometryName = condition?.geometryFileName
  const datasetName = condition?.datasetFileName
  const complete = Boolean(geometryName && datasetName)
  return (
    <div className={`condition-row${complete ? ' complete' : ''}`}>
      <div className="condition-name">
        <span className={`condition-code ${conditionKey.toLowerCase()}`}>
          {conditionKey}
        </span>
        <strong>{label}</strong>
        {condition ? (
          <button
            className="icon-button tiny danger condition-remove"
            type="button"
            title={`Remove ${label} inputs`}
            aria-label={`Remove ${label} inputs`}
            onClick={onRemove}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="condition-badges">
        <span
          className={geometryName ? 'status-badge ready' : 'status-badge'}
          title={geometryName}
        >
          {geometryName
            ? `${condition?.projected?.N.toLocaleString()} nodes`
            : 'geometry'}
        </span>
        <span
          className={datasetName ? 'status-badge ready' : 'status-badge'}
          title={datasetName}
        >
          {datasetName ? `${condition?.datasets?.runs.length} runs` : 'datasets'}
        </span>
      </div>
    </div>
  )
}

export function ModelsWorkspace({
  busy,
  existingCondition,
  proposedCondition,
  existingRuns,
  proposedRuns,
  existingRun,
  proposedRun,
  onH5Files,
  onRemoveCondition,
  onExistingRunChange,
  onProposedRunChange,
}: ModelsWorkspaceProps) {
  return (
    <>
      <section className="workflow-block">
        <div className="block-title">
          <UploadCloud size={17} aria-hidden="true" />
          <span>SMS mesh and results</span>
          <span className="file-chip">.h5</span>
        </div>
        <FileDrop
          accept=".h5"
          title="Add geometry + datasets"
          description="Existing and Proposed, any order"
          disabled={busy}
          testId="h5-file-drop"
          onFiles={onH5Files}
        />
        <div className="condition-list">
          <ConditionStatus
            label="Existing"
            conditionKey="EX"
            condition={existingCondition}
            onRemove={() => onRemoveCondition('EX')}
          />
          <ConditionStatus
            label="Proposed"
            conditionKey="PR"
            condition={proposedCondition}
            onRemove={() => onRemoveCondition('PR')}
          />
        </div>
      </section>

      <section className="workflow-block">
        <div className="block-title">
          <RefreshCcw size={17} aria-hidden="true" />
          <span>Run pairing</span>
        </div>
        <label className="field">
          <span>Existing run</span>
          <select
            value={existingRun}
            disabled={existingRuns.length === 0}
            onChange={(event) =>
              onExistingRunChange(Number(event.target.value))
            }
          >
            {existingRuns.length === 0 ? (
              <option>Waiting for Existing files</option>
            ) : (
              existingRuns.map((selection) => (
                <option key={selection.index} value={selection.index}>
                  {runDisplayName(selection.run.name)}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="field">
          <span>Proposed run</span>
          <select
            value={proposedRun}
            disabled={proposedRuns.length === 0}
            onChange={(event) =>
              onProposedRunChange(Number(event.target.value))
            }
          >
            {proposedRuns.length === 0 ? (
              <option>Waiting for Proposed files</option>
            ) : (
              proposedRuns.map((selection) => (
                <option key={selection.index} value={selection.index}>
                  {runDisplayName(selection.run.name)}
                </option>
              ))
            )}
          </select>
        </label>
      </section>
    </>
  )
}
