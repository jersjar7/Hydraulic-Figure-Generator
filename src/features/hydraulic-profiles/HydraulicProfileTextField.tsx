import { useState, type ReactNode } from 'react'
import { FileDrop } from '../../components/FileDrop'

type Props = {
  label: string
  value: string
  large?: boolean
  dropTitle: string
  dropTestId: string
  status: ReactNode
  onChange(value: string): void
}

export function HydraulicProfileTextField({
  label,
  value,
  large = false,
  dropTitle,
  dropTestId,
  status,
  onChange,
}: Props) {
  const [error, setError] = useState<string | null>(null)

  const importFile = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      onChange(await file.text())
      setError(null)
    } catch {
      setError(`Could not read ${file.name}.`)
    }
  }

  return (
    <div className="profile-input-stack profile-text-input">
      <div className="profile-text-file-drop">
        <FileDrop
          accept=".txt,text/plain"
          multiple={false}
          title={dropTitle}
          description="or click to browse"
          testId={dropTestId}
          onFiles={(files) => { void importFile(files) }}
        />
      </div>
      {error ? <div className="profile-text-file-error" role="alert">{error}</div> : null}
      <label className="field">
        <span>{label}</span>
        <textarea
          className={`profile-paste${large ? ' large' : ''}`}
          aria-label={label}
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
      {status}
    </div>
  )
}
