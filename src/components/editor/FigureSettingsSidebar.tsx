import { X, type LucideIcon } from 'lucide-react'
import type {
  KeyboardEvent,
  ReactNode,
} from 'react'

export type FigureSettingsSection<Key extends string = string> = {
  key: Key
  label: string
  title: string
  icon: LucideIcon
}

type Props<Key extends string> = {
  mobileOpen: boolean
  sections: readonly FigureSettingsSection<Key>[]
  activeSection: Key
  onSectionChange(section: Key): void
  onSectionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void
  onMobileClose(): void
  children: ReactNode
  footer?: ReactNode
  heading?: string
}

export function FigureSettingsSidebar<Key extends string>({
  mobileOpen,
  sections,
  activeSection,
  onSectionChange,
  onSectionKeyDown,
  onMobileClose,
  children,
  footer,
  heading = 'Figure settings',
}: Props<Key>) {
  return (
    <aside
      className={`sidebar right-sidebar${mobileOpen ? ' is-mobile-open' : ''}`}
    >
      <div className="sidebar-heading">
        <div>
          <span className="eyebrow">Output</span>
          <h2>{heading}</h2>
        </div>
        <button
          className="icon-button mobile-close"
          type="button"
          title="Close figure settings"
          aria-label="Close figure settings"
          onClick={onMobileClose}
        >
          <X size={18} />
        </button>
      </div>

      <nav
        className="settings-switcher"
        aria-label="Figure settings sections"
        role="tablist"
      >
        {sections.map((section, index) => {
          const Icon = section.icon
          const active = activeSection === section.key
          return (
            <button
              className={`settings-tab${active ? ' active' : ''}`}
              type="button"
              role="tab"
              id={`settings-tab-${section.key}`}
              aria-controls={`settings-panel-${section.key}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              title={section.title}
              key={section.key}
              onClick={() => onSectionChange(section.key)}
              onKeyDown={(event) => onSectionKeyDown(event, index)}
            >
              <Icon
                className="settings-tab-icon"
                size={18}
                aria-hidden="true"
              />
              <span className="settings-tab-label">{section.label}</span>
            </button>
          )
        })}
      </nav>

      <div
        className="right-scroll"
        id={`settings-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${activeSection}`}
      >
        {children}
      </div>

      {footer}
    </aside>
  )
}
