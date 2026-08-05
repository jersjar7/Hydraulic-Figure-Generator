import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HydraulicProfileScene } from '../../core/types'

type Props = {
  scenes: HydraulicProfileScene[]
  selectedSectionId: string
  onSelect(sectionId: string): void
}

export function HydraulicProfileStationNavigator({
  scenes,
  selectedSectionId,
  onSelect,
}: Props) {
  const selectedIndex = Math.max(
    0,
    scenes.findIndex(({ section }) => section.id === selectedSectionId),
  )
  const selectOffset = (offset: number) => {
    const next = scenes[selectedIndex + offset]
    if (next) onSelect(next.section.id)
  }

  return (
    <nav className="profile-station-navigator" aria-label="Generated cross sections">
      <button className="icon-button" type="button" title="Previous station" aria-label="Previous station" disabled={selectedIndex === 0} onClick={() => selectOffset(-1)}><ChevronLeft size={17} /></button>
      <div className="profile-station-tabs" role="tablist" aria-label="Cross-section stations">
        {scenes.map(({ section }) => (
          <button
            className={section.id === selectedSectionId ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={section.id === selectedSectionId}
            key={section.id}
            onClick={() => onSelect(section.id)}
          >
            {section.stationLabel}
          </button>
        ))}
      </div>
      <span className="profile-station-count">{selectedIndex + 1} of {scenes.length}</span>
      <button className="icon-button" type="button" title="Next station" aria-label="Next station" disabled={selectedIndex >= scenes.length - 1} onClick={() => selectOffset(1)}><ChevronRight size={17} /></button>
    </nav>
  )
}
