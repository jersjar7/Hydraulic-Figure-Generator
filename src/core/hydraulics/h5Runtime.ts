export type H5Node = {
  shape?: number[]
  value?: ArrayLike<number> | string
  attrs?: Record<string, { value?: unknown }>
  keys?: () => string[]
}

export type H5File = {
  get(path: string): H5Node
  close(): unknown
}

export type H5Runtime = {
  ready: Promise<unknown>
  FS: {
    unlink(path: string): void
    writeFile(path: string, data: Uint8Array): void
  }
  File: new (path: string, mode: string) => H5File
}

let runtimePromise: Promise<H5Runtime> | null = null

export function getH5Runtime() {
  if (!runtimePromise) {
    runtimePromise = import('h5wasm').then(async (module) => {
      const runtime = module as unknown as H5Runtime
      await runtime.ready
      return runtime
    })
  }
  return runtimePromise
}
