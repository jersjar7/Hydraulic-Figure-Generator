import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

type FileDropProps = {
  accept: string
  multiple?: boolean
  title: string
  description: ReactNode
  disabled?: boolean
  testId?: string
  onFiles(files: File[]): void
}

export function FileDrop({
  accept,
  multiple = true,
  title,
  description,
  disabled = false,
  testId,
  onFiles,
}: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const receiveFiles = (files: FileList | null) => {
    if (!files?.length) return
    onFiles(Array.from(files))
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) receiveFiles(event.dataTransfer.files)
  }

  return (
    <label
        className={`file-drop${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        data-testid={testId}
      >
        <Upload aria-hidden="true" size={18} />
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <input
          ref={inputRef}
          className="file-drop-input"
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            receiveFiles(event.currentTarget.files)
            event.currentTarget.value = ''
          }}
        />
      </label>
  )
}
