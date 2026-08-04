import {
  AlignmentType,
  Document,
  Header,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  SectionType,
  TextRun,
} from 'docx'
import type {
  WordDocumentPage,
  WordDocumentPort,
} from '../../application/ports/wordDocument'
import type { FigureDocumentSettings } from '../../core/types'

const TWIPS_PER_INCH = 1440
const PIXELS_PER_INCH = 96
const LETTER = {
  portrait: { width: 8.5, height: 11 },
  landscape: { width: 11, height: 8.5 },
} as const

function imageSize(
  page: WordDocumentPage,
  settings: FigureDocumentSettings,
) {
  const paper = LETTER[settings.orientation]
  const availableWidth = (paper.width - settings.marginInches * 2) * PIXELS_PER_INCH
  const availableHeight = (
    paper.height - settings.marginInches * 2 - 0.8
  ) * PIXELS_PER_INCH
  const scale = Math.min(
    1,
    availableWidth / page.image.widthPx,
    availableHeight / page.image.heightPx,
  )
  return {
    width: Math.round(page.image.widthPx * scale),
    height: Math.round(page.image.heightPx * scale),
  }
}

export const docxWordDocumentPort: WordDocumentPort = {
  async create({ settings, pages }) {
    const margin = Math.round(settings.marginInches * TWIPS_PER_INCH)
    const document = new Document({
      creator: 'Hydraulic Figure Generator',
      title: settings.title,
      description: 'Hydraulic figure set generated in the browser.',
      sections: pages.map((page) => ({
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: {
              orientation: settings.orientation === 'landscape'
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
            },
            margin: {
              top: margin,
              right: margin,
              bottom: margin,
              left: margin,
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: settings.title,
                color: '66788A',
                size: 16,
              })],
            })],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new ImageRun({
              type: 'png',
              data: page.image.data,
              transformation: imageSize(page, settings),
              altText: {
                title: page.title,
                description: page.caption,
                name: page.title,
              },
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            keepNext: true,
            children: [new TextRun({
              text: `${settings.captionPrefix} ${page.figureNumber}. ${page.caption}`,
              size: 20,
            })],
          }),
        ],
      })),
    })
    return Packer.toArrayBuffer(document)
  },
}
