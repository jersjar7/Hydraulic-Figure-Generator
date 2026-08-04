import type {
  IngestNotice,
  MapOverlay,
} from '../../core/types'

export type OverlayImportResult = {
  overlays: MapOverlay[]
  notices: IngestNotice[]
}

export interface HydraulicFileIngestionPort {
  ingest(files: File[]): Promise<IngestNotice[]>
}

export interface OverlayArchivePort {
  read(files: File[], startingIndex: number): Promise<OverlayImportResult>
}

export type TextDownload = {
  contents: string
  fileName: string
  mimeType: string
}

export type BinaryDownload = {
  contents: ArrayBuffer
  fileName: string
  mimeType: string
}

export interface ProjectFilePort {
  readText(file: File): Promise<string>
  downloadText(download: TextDownload): void
}

export interface BinaryFilePort {
  downloadBinary(download: BinaryDownload): void
}
