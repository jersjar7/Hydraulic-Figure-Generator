import { RefreshCcw, X } from 'lucide-react'
import { SettingsGroup } from '../../components/settings/SettingsGroup'
import { runDisplayName } from '../../core/hydraulicEngine'
import type {
  ConditionData,
  ConditionKey,
  RunSelection,
  WseAssessmentLineCollection,
} from '../../core/types'

type Props = {
  busy: boolean
  scenarios: ConditionData[]
  sourceId: ConditionKey
  sourceRun: number
  sourceRuns: RunSelection[]
  collection: WseAssessmentLineCollection
  onSourceChange(id: ConditionKey): void
  onSourceRunChange(index: number): void
  onIntervalChange(interval: number): void
  onGenerate(): void
  onClear(): void
}

export function AssessmentLineSourcePanel({
  busy,
  scenarios,
  sourceId,
  sourceRun,
  sourceRuns,
  collection,
  onSourceChange,
  onSourceRunChange,
  onIntervalChange,
  onGenerate,
  onClear,
}: Props) {
  const generated = collection.lines.length > 0
  return (
    <>
      <SettingsGroup title="Source">
        <label className="field">
          <span>Hydraulic scenario</span>
          <select
            value={sourceId}
            disabled={scenarios.length === 0}
            onChange={(event) => onSourceChange(event.target.value)}
          >
            {scenarios.length === 0 ? (
              <option value="">Add models first</option>
            ) : scenarios.map((scenario) => (
              <option value={scenario.key} key={scenario.key}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>WSE run</span>
          <select
            value={sourceRun}
            disabled={sourceRuns.length === 0}
            onChange={(event) => onSourceRunChange(Number(event.target.value))}
          >
            {sourceRuns.length === 0 ? (
              <option value={0}>Waiting for datasets</option>
            ) : sourceRuns.map((selection) => (
              <option value={selection.index} key={selection.index}>
                {runDisplayName(selection.run.name)}
              </option>
            ))}
          </select>
        </label>
      </SettingsGroup>
      <SettingsGroup title="Generate">
        <label className="field">
          <span>Elevation interval</span>
          <select
            value={collection.interval}
            disabled={busy}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
          >
            <option value="1">Whole foot (1.0 ft)</option>
            <option value="0.5">Half foot (0.5 ft)</option>
          </select>
        </label>
        <button
          className="button secondary compact full"
          type="button"
          disabled={busy || sourceRuns.length === 0}
          onClick={onGenerate}
        >
          <RefreshCcw size={15} aria-hidden="true" />
          {generated ? 'Regenerate WSE lines' : 'Generate WSE lines'}
        </button>
        {generated ? (
          <div className="assessment-summary">
            <div>
              <strong>{collection.lines.length.toLocaleString()} lines</strong>
              <span>{collection.levelCount.toLocaleString()} elevation levels</span>
            </div>
            <button
              className="icon-button small danger"
              type="button"
              title="Clear WSE lines"
              aria-label="Clear WSE lines"
              onClick={onClear}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </SettingsGroup>
    </>
  )
}
