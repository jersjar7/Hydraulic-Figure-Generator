import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { exportFigureDocument } from '../src/application/documents/exportFigureDocument'
import type { WordDocumentRequest } from '../src/application/ports/wordDocument'
import { createDefaultFigureDocumentSettings } from '../src/core/types'
import { docxWordDocumentPort } from '../src/infrastructure/documents/docxWordDocumentPort'

const onePixelPng = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
))

describe('figure document export', () => {
  it('renders pages sequentially, numbers them, and downloads one document', async () => {
    const calls: string[] = []
    let written: WordDocumentRequest | undefined
    let downloaded: { fileName: string; contents: ArrayBuffer } | undefined
    const settings = {
      ...createDefaultFigureDocumentSettings(),
      startingFigureNumber: 7,
    }

    const result = await exportFigureDocument({
      items: [
        { id: 'a', title: 'Depth', caption: 'Depth result' },
        { id: 'b', title: 'Velocity', caption: 'Velocity result' },
      ],
      settings,
      fileName: 'set.docx',
      render: async (item) => {
        calls.push(item.id)
        return { data: onePixelPng, widthPx: 1, heightPx: 1 }
      },
      writer: {
        create: async (request) => {
          written = request
          return new Uint8Array([80, 75]).buffer
        },
      },
      files: {
        downloadBinary: (download) => { downloaded = download },
      },
    })

    assert.deepEqual(calls, ['a', 'b'])
    assert.equal(result.pageCount, 2)
    assert.deepEqual(written?.pages.map((page) => page.figureNumber), [7, 8])
    assert.equal(downloaded?.fileName, 'set.docx')
    assert.deepEqual(
      new Uint8Array(downloaded?.contents ?? new ArrayBuffer()),
      new Uint8Array([80, 75]),
    )
  })

  it('creates a valid zipped Word package with the docx adapter', async () => {
    const contents = await docxWordDocumentPort.create({
      settings: createDefaultFigureDocumentSettings(),
      pages: [{
        figureNumber: 1,
        title: 'Water depth',
        caption: 'Modeled water depth.',
        image: { data: onePixelPng, widthPx: 1, heightPx: 1 },
      }],
    })

    const bytes = new Uint8Array(contents)
    assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'PK')
    assert.ok(bytes.length > 1_000)
  })
})
