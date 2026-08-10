import assert from 'node:assert/strict'
import { createCanvas } from '@napi-rs/canvas'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import { FRAMES, makeMapView } from '../src/core/map/view'
import { drawCrossSectionSelectionOverlay } from '../src/features/cross-section/crossSectionSelectionOverlay'
import { createDefaultCrossSectionSettings } from '../src/features/cross-section/crossSectionSettings'

function renderSelection(downstreamSide: 'left' | 'right') {
  const frame = FRAMES.landscape
  const canvas = createCanvas(frame.width, frame.height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, frame.width, frame.height)
  drawCrossSectionSelectionOverlay(
    context as unknown as CanvasRenderingContext2D,
    {
      id: 'manual-1',
      label: 'Manual section',
      source: 'assessment',
      points: [
        { x: 20, y: 50 },
        { x: 80, y: 50 },
      ],
      direction: 'a-to-b',
    },
    { x0: 0, x1: 100, y0: 0, y1: 100 },
    createDefaultFigureSettings(),
    {
      ...createDefaultCrossSectionSettings(),
      downstreamSide,
      lookingDirection: 'downstream',
    },
  )
  return canvas
}

function countRedPixels(
  canvas: ReturnType<typeof createCanvas>,
  half: 'top' | 'bottom',
) {
  const context = canvas.getContext('2d')
  const startY = half === 'top' ? 0 : canvas.height / 2
  const height = canvas.height / 2
  const pixels = context
    .getImageData(0, startY, canvas.width, height)
    .data
  let red = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] > 110 &&
      pixels[index] > pixels[index + 1] * 1.35 &&
      pixels[index] > pixels[index + 2] * 1.35
    ) {
      red += 1
    }
  }
  return red
}

function countRedPixelsNear(
  canvas: ReturnType<typeof createCanvas>,
  center: { x: number; y: number },
  side: 'top' | 'bottom',
) {
  const context = canvas.getContext('2d')
  const x = Math.max(0, Math.round(center.x - 34))
  const y = Math.max(
    0,
    Math.round(side === 'top' ? center.y - 34 : center.y),
  )
  const pixels = context.getImageData(x, y, 68, 34).data
  let red = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] > 110 &&
      pixels[index] > pixels[index + 1] * 1.35 &&
      pixels[index] > pixels[index + 2] * 1.35
    ) {
      red += 1
    }
  }
  return red
}

describe('cross-section selection overlay', () => {
  it('draws the downstream view arrow on the configured side of A to B', () => {
    const right = renderSelection('right')
    const left = renderSelection('left')

    assert.ok(
      countRedPixels(right, 'bottom') > countRedPixels(right, 'top'),
      'right-side downstream arrow should render below a left-to-right section',
    )
    assert.ok(
      countRedPixels(left, 'top') > countRedPixels(left, 'bottom'),
      'left-side downstream arrow should render above a left-to-right section',
    )
  })

  it('places matching view-direction chevrons beside both endpoints', () => {
    const right = renderSelection('right')
    const view = makeMapView(
      { x0: 0, x1: 100, y0: 0, y1: 100 },
      FRAMES.landscape,
      createDefaultFigureSettings(),
    )

    for (const x of [20, 80]) {
      const [screenX, screenY] = view.toScreen(x, 50)
      assert.ok(
        countRedPixelsNear(
          right,
          { x: screenX, y: screenY },
          'bottom',
        ) > 0,
        `endpoint at x=${x} should have a downstream chevron`,
      )
    }
  })
})
