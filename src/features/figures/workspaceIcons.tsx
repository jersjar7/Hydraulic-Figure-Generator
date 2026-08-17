import type { ReactNode } from 'react'

type WorkspaceIconProps = {
  size?: number
}

function WorkspaceIconFrame({
  children,
  size = 24,
}: WorkspaceIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CrossSectionComparisonIcon(props: WorkspaceIconProps) {
  return (
    <WorkspaceIconFrame {...props}>
      <path d="M2.5 5.5 7 10.5l3 7h4l3-7 4.5-5" stroke="#7a5b36" />
      <path d="M6.8 11.6h10.4" stroke="#1874b5" />
      <path d="M8.1 14.2h7.8" stroke="#7950b5" strokeDasharray="2 1.5" />
      <path d="M12 11.8v2.2m-1-1 1 1 1-1" />
    </WorkspaceIconFrame>
  )
}

export function HydraulicProfilesSectionsIcon(props: WorkspaceIconProps) {
  return (
    <WorkspaceIconFrame {...props}>
      <path d="M3 3.5v17h18" opacity="0.65" />
      <path d="m4.7 17 3.4-2.1 3.2.9 3.8-4.5 4.7-2.1" stroke="#7a5b36" />
      <path d="m4.7 14.2 3.4-2 3.2.7 3.8-4.3 4.7-1.8" stroke="#1874b5" />
      <path d="M12.8 5.2v13.5" strokeDasharray="2 2" opacity="0.65" />
    </WorkspaceIconFrame>
  )
}

export function PlanViewHydraulicResultsIcon(props: WorkspaceIconProps) {
  return (
    <WorkspaceIconFrame {...props}>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.55" />
      <path d="M3.2 7.2c3.1-2 5.2 2.6 8.5 1.2 3.4-1.4 5.1-3.2 9.6-.8" stroke="#16809e" />
      <path d="M3.2 16.9c3.1-1.9 5.2 2.4 8.5.7 3.4-1.7 5.1-3.8 9.6-1.8" stroke="#16809e" />
      <path d="M6.4 6.7 7 17.4M11 8.7l.8 8.8m4-11.2.8 9.9" stroke="#4c7285" opacity="0.8" />
      <path d="M3.5 12c3.1-2 5.1 2.5 8.3 1 3.4-1.6 5-3.4 9.1-1.4" stroke="#1768a0" strokeDasharray="2 1.7" />
    </WorkspaceIconFrame>
  )
}

export function WseDifferenceIcon(props: WorkspaceIconProps) {
  return (
    <WorkspaceIconFrame {...props}>
      <rect x="2.5" y="3.5" width="19" height="17" rx="1.5" opacity="0.55" />
      <path
        d="M4.3 7.8c1.1-2.2 4.9-2.5 6.2-.3 1.1 1.9-.8 4.8-3.3 4.6-2.4-.1-3.9-2.4-2.9-4.3Z"
        fill="#d8664d"
        fillOpacity="0.2"
        stroke="#b94a34"
      />
      <path d="M7.4 7.2v2.8M6 8.6h2.8" stroke="#b94a34" />
      <path
        d="M13.3 13.8c.8-2.5 4.7-3.4 6.1-1.3 1.4 2-.2 5-2.8 5.2-2.4.2-4-1.6-3.3-3.9Z"
        fill="#4f8fc6"
        fillOpacity="0.2"
        stroke="#2d70aa"
      />
      <path d="M15.3 14.7h2.8" stroke="#2d70aa" />
    </WorkspaceIconFrame>
  )
}
