import type {
  CenterlineCandidate,
  CenterlineDirection,
} from '../../core/types'

export type CenterlineSourceControlsProps = {
  candidates: CenterlineCandidate[]
  centerlineId: string
  selectedCenterlineIds?: string[]
  direction: CenterlineDirection
  startStation: number
  onCenterlineChange(id: string): void
  onCenterlineToggle?(id: string, selected: boolean): void
  onDirectionChange(direction: CenterlineDirection): void
  onStartStationChange(station: number): void
}

function candidateName(
  candidate: CenterlineCandidate,
  candidates: CenterlineCandidate[],
) {
  const sameOverlay = candidates.filter(
    (item) => item.overlayId === candidate.overlayId,
  )
  return sameOverlay.length === 1
    ? candidate.overlayName
    : `${candidate.overlayName} - feature ${candidate.featureIndex + 1}, part ${candidate.partIndex + 1}`
}

export function CenterlineSourceControls({
  candidates,
  centerlineId,
  selectedCenterlineIds,
  direction,
  startStation,
  onCenterlineChange,
  onCenterlineToggle,
  onDirectionChange,
  onStartStationChange,
}: CenterlineSourceControlsProps) {
  const multiple = Boolean(onCenterlineToggle && selectedCenterlineIds)
  const selectedCandidates = candidates.filter((candidate) =>
    selectedCenterlineIds?.includes(candidate.id),
  )
  return (
    <div className="assessment-stationing-controls">
      {multiple ? (
        <>
          <fieldset className="centerline-selection-list">
            <legend>Centerlines on figure</legend>
            {candidates.map((candidate) => (
              <label key={candidate.id}>
                <input
                  type="checkbox"
                  checked={selectedCenterlineIds!.includes(candidate.id)}
                  onChange={(event) =>
                    onCenterlineToggle!(candidate.id, event.target.checked)
                  }
                />
                <span>{candidateName(candidate, candidates)}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Edit stationing for</span>
            <select
              value={centerlineId}
              disabled={selectedCandidates.length === 0}
              onChange={(event) => onCenterlineChange(event.target.value)}
            >
              <option value="">Select a stationed centerline</option>
              {selectedCandidates.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidateName(candidate, candidates)}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <label className="field">
          <span>Centerline feature</span>
          <select
            value={centerlineId}
            disabled={candidates.length === 0}
            onChange={(event) => onCenterlineChange(event.target.value)}
          >
            <option value="">Select a line overlay</option>
            {candidates.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                {candidateName(candidate, candidates)}
              </option>
            ))}
          </select>
        </label>
      )}
      {candidates.length === 0 ? (
        <p className="assessment-guidance">
          Add a zipped line shapefile in Layers.
        </p>
      ) : null}

      <label className="field">
        <span>
          Starting station
          <small>ft</small>
        </span>
        <input
          type="number"
          step="1"
          value={startStation}
          disabled={!centerlineId}
          onChange={(event) => {
            const station = Number(event.target.value)
            if (Number.isFinite(station)) onStartStationChange(station)
          }}
        />
      </label>

      <div className="field">
        <span>Downstream endpoint</span>
        <div className="segmented assessment-direction">
          <button
            type="button"
            className={direction === 'a-to-b' ? 'active' : ''}
            disabled={!centerlineId}
            onClick={() => onDirectionChange('a-to-b')}
          >
            A downstream
          </button>
          <button
            type="button"
            className={direction === 'b-to-a' ? 'active' : ''}
            disabled={!centerlineId}
            onClick={() => onDirectionChange('b-to-a')}
          >
            B downstream
          </button>
        </div>
      </div>
    </div>
  )
}
