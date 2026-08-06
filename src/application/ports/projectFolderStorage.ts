export type ProjectDirectoryReference = {
  name: string
  handle: unknown
}

export type ProjectDirectoryPickerOptions = {
  id: string
  mode: 'read' | 'readwrite'
}

export interface ProjectFolderStoragePort {
  isSupported(): boolean
  pickDirectory(
    options: ProjectDirectoryPickerOptions,
  ): Promise<ProjectDirectoryReference | null>
  directoryExists(
    parent: ProjectDirectoryReference,
    name: string,
  ): Promise<boolean>
  createDirectory(
    parent: ProjectDirectoryReference,
    name: string,
  ): Promise<ProjectDirectoryReference>
  readText(directory: ProjectDirectoryReference, path: string): Promise<string>
  writeText(
    directory: ProjectDirectoryReference,
    path: string,
    contents: string,
  ): Promise<void>
}
