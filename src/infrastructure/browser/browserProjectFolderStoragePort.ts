import type {
  ProjectDirectoryPickerOptions,
  ProjectDirectoryReference,
  ProjectFolderStoragePort,
} from '../../application/ports/projectFolderStorage'

type BrowserFileHandle = {
  getFile(): Promise<File>
  createWritable(): Promise<{
    write(contents: string): Promise<void>
    close(): Promise<void>
  }>
}

type BrowserDirectoryHandle = {
  name: string
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<BrowserDirectoryHandle>
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<BrowserFileHandle>
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (
    options: ProjectDirectoryPickerOptions,
  ) => Promise<BrowserDirectoryHandle>
}

function nativeDirectory(reference: ProjectDirectoryReference) {
  return reference.handle as BrowserDirectoryHandle
}

function reference(handle: BrowserDirectoryHandle): ProjectDirectoryReference {
  return { name: handle.name, handle }
}

function pathParts(path: string) {
  return path.replaceAll('\\', '/').split('/').filter(Boolean)
}

async function resolveParent(
  directory: BrowserDirectoryHandle,
  path: string,
  create: boolean,
) {
  const parts = pathParts(path)
  const fileName = parts.pop()
  if (!fileName) throw new Error('A project file path is required.')
  let parent = directory
  for (const part of parts) {
    parent = await parent.getDirectoryHandle(part, { create })
  }
  return { parent, fileName }
}

export const browserProjectFolderStoragePort: ProjectFolderStoragePort = {
  isSupported: () => typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function',
  pickDirectory: async (options) => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker
    if (!picker) throw new Error('Folder projects are not supported by this browser.')
    try {
      return reference(await picker(options))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      throw error
    }
  },
  directoryExists: async (parent, name) => {
    try {
      await nativeDirectory(parent).getDirectoryHandle(name)
      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return false
      throw error
    }
  },
  createDirectory: async (parent, name) =>
    reference(await nativeDirectory(parent).getDirectoryHandle(name, { create: true })),
  readText: async (directory, path) => {
    const { parent, fileName } = await resolveParent(nativeDirectory(directory), path, false)
    const file = await parent.getFileHandle(fileName)
    return (await file.getFile()).text()
  },
  writeText: async (directory, path, contents) => {
    const { parent, fileName } = await resolveParent(nativeDirectory(directory), path, true)
    const file = await parent.getFileHandle(fileName, { create: true })
    const writable = await file.createWritable()
    await writable.write(contents)
    await writable.close()
  },
}
