import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createDefaultFigureSettings } from '../src/core/defaults'
import type { HydraulicEngine } from '../src/core/hydraulicEngine'
import {
  hitTestAnnotation,
  mapPointToCanvas,
} from '../src/core/mapRenderer'
import type {
  Bounds,
  MapAnnotation,
  WseDifferenceScene,
} from '../src/core/types'
import { createAnnotationMapTool } from '../src/features/wse-difference/map-tools/annotationTool'
import { createFigureElementInteractionTool } from '../src/features/figure-elements/figureElementInteractionTool'

describe('WSE map tools', () => {
  it('moves and cancels a report-element drag through its own session', () => {
    const settings = createDefaultFigureSettings()
    const original = { ...settings.elementPositions.title }
    let current = original
    const dragging: boolean[] = []
    const tool = createFigureElementInteractionTool({
      enabled: true,
      settings,
      elementBounds: () => [
        { key: 'title', x: 10, y: 20, width: 100, height: 50 },
      ],
      selectElement: () => {},
      previewPosition: (_key, position) => {
        current = position
      },
      commitPosition: () => {},
      setDragging: (value) => dragging.push(value),
      setHovered: () => {},
    })
    const started = tool.begin({
      screenPoint: { x: 20, y: 30 },
      mapPoint: { x: 0, y: 0 },
    })

    started?.session?.move?.({
      screenPoint: { x: 50, y: 70 },
      mapPoint: { x: 0, y: 0 },
    })
    assert.equal(current.offX, original.offX + 30)
    assert.equal(current.offY, original.offY + 40)

    started?.session?.cancel?.()
    assert.deepEqual(current, original)
    assert.deepEqual(dragging, [true, false])
  })

  it('commits one report-element move and selects locked elements without dragging', () => {
    const settings = createDefaultFigureSettings()
    const original = { ...settings.elementPositions.title }
    let selected: string | null = null
    let committed: {
      before: typeof original
      after: typeof original
    } | null = null
    const tool = createFigureElementInteractionTool({
      enabled: true,
      settings,
      elementBounds: () => [
        { key: 'title', x: 10, y: 20, width: 100, height: 50 },
      ],
      selectElement: (key) => { selected = key },
      previewPosition: () => {},
      commitPosition: (_key, before, after) => {
        committed = { before, after }
      },
      setDragging: () => {},
      setHovered: () => {},
    })
    const started = tool.begin({
      screenPoint: { x: 20, y: 30 },
      mapPoint: { x: 0, y: 0 },
    })
    started?.session?.finish?.({
      screenPoint: { x: 55, y: 75 },
      mapPoint: { x: 0, y: 0 },
    })

    assert.equal(selected, 'title')
    assert.deepEqual(committed?.before, original)
    assert.equal(committed?.after.offX, original.offX + 35)
    assert.equal(committed?.after.offY, original.offY + 45)

    settings.elementPositions.title.locked = true
    committed = null
    const locked = tool.begin({
      screenPoint: { x: 20, y: 30 },
      mapPoint: { x: 0, y: 0 },
    })
    assert.equal(locked?.handled, true)
    assert.equal(locked?.session, undefined)
    assert.equal(committed, null)
  })

  it('selects and moves an annotation through the annotation tool', () => {
    const settings = createDefaultFigureSettings()
    const bounds: Bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }
    let annotations: MapAnnotation[] = [
      {
        id: 'line-1',
        kind: 'line',
        points: [
          { x: 20, y: 20 },
          { x: 40, y: 40 },
        ],
        text: '',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 3,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: false,
      },
    ]
    let selected: string | null = null
    let shown: string | null = null
    const screenPoint = mapPointToCanvas(
      { x: 30, y: 30 },
      bounds,
      settings,
    )
    const tool = createAnnotationMapTool({
      tool: 'select',
      annotations,
      annotationStart: null,
      defaults: {
        text: 'Note',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 3,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: true,
        resultField: 'summary',
      },
      scene: {} as WseDifferenceScene,
      engine: {} as HydraulicEngine,
      bounds,
      settings,
      setAnnotations: (value) => {
        annotations =
          typeof value === 'function' ? value(annotations) : value
      },
      commitAnnotationChange: () => {},
      setSelectedId: (id) => {
        selected = id
      },
      setAnnotationStart: () => {},
      showPlacedAnnotation: (annotation) => {
        shown = annotation.id
      },
      setDragging: () => {},
      createAnnotation: () => annotations[0],
      appendNotices: () => {},
    })
    const started = tool.begin({
      screenPoint,
      mapPoint: { x: 30, y: 30 },
    })

    started?.session?.move?.({
      screenPoint,
      mapPoint: { x: 35, y: 37 },
    })

    assert.equal(selected, 'line-1')
    assert.equal(shown, 'line-1')
    assert.deepEqual(annotations[0].points, [
      { x: 25, y: 27 },
      { x: 45, y: 47 },
    ])
  })

  it('commits a text annotation canvas drag through the figure-object kernel', () => {
    const settings = createDefaultFigureSettings()
    const bounds: Bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }
    let annotations: MapAnnotation[] = [
      {
        id: 'text-1',
        kind: 'text',
        points: [{ x: 50, y: 50 }],
        text: 'Move me',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 2,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: true,
      },
    ]
    const committed: Array<{
      before: MapAnnotation[]
      after: MapAnnotation[]
      label: string
    }> = []
    const start = mapPointToCanvas(
      annotations[0].points[0],
      bounds,
      settings,
    )
    const tool = createAnnotationMapTool({
      tool: 'select',
      annotations,
      annotationStart: null,
      defaults: {
        text: 'Note',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 2,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: true,
        resultField: 'summary',
      },
      scene: {} as WseDifferenceScene,
      engine: {} as HydraulicEngine,
      bounds,
      settings,
      setAnnotations: (value) => {
        annotations =
          typeof value === 'function' ? value(annotations) : value
      },
      commitAnnotationChange: (before, after, label) => {
        committed.push({ before, after, label })
      },
      setSelectedId: () => {},
      setAnnotationStart: () => {},
      showPlacedAnnotation: () => {},
      setDragging: () => {},
      createAnnotation: () => annotations[0],
      appendNotices: () => {},
    })
    const started = tool.begin({
      screenPoint: start,
      mapPoint: { x: 50, y: 50 },
    })
    const end = { x: start.x + 25, y: start.y + 15 }
    started?.session?.move?.({
      screenPoint: end,
      mapPoint: { x: 50, y: 50 },
    })
    started?.session?.finish?.({
      screenPoint: end,
      mapPoint: { x: 50, y: 50 },
    })

    assert.equal(started?.session?.id, 'figure-object:text-1')
    assert.equal(committed.length, 1)
    assert.equal(committed[0].label, 'move text annotation')
    assert.deepEqual(committed[0].before[0].points, [{ x: 50, y: 50 }])
    assert.notDeepEqual(committed[0].after[0].points, [{ x: 50, y: 50 }])
  })

  it('moves anchored callout labels and endpoints independently', () => {
    const settings = createDefaultFigureSettings()
    const bounds: Bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }
    let annotations: MapAnnotation[] = [
      {
        id: 'leader-1',
        kind: 'leader',
        points: [
          { x: 20, y: 20 },
          { x: 80, y: 80 },
        ],
        defaultPoints: [
          { x: 20, y: 20 },
          { x: 80, y: 80 },
        ],
        text: 'Review location',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 2,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: true,
      },
    ]
    const committed: MapAnnotation[][] = []
    const createTool = () =>
      createAnnotationMapTool({
        tool: 'select',
        annotations,
        annotationStart: null,
        defaults: {
          text: 'Note',
          color: '#111111',
          fillColor: '#ffffff',
          lineWidth: 2,
          fontSize: 18,
          rotation: 0,
          dashed: false,
          background: true,
          resultField: 'summary',
        },
        scene: {} as WseDifferenceScene,
        engine: {} as HydraulicEngine,
        bounds,
        settings,
        setAnnotations: (value) => {
          annotations =
            typeof value === 'function' ? value(annotations) : value
        },
        commitAnnotationChange: (_before, after) => {
          committed.push(after)
        },
        setSelectedId: () => {},
        setAnnotationStart: () => {},
        showPlacedAnnotation: () => {},
        setDragging: () => {},
        createAnnotation: () => annotations[0],
        appendNotices: () => {},
      })

    const labelStart = mapPointToCanvas(
      annotations[0].points[1],
      bounds,
      settings,
    )
    const labelDrag = createTool().begin({
      screenPoint: labelStart,
      mapPoint: annotations[0].points[1],
    })
    const labelEnd = { x: labelStart.x - 30, y: labelStart.y + 20 }
    labelDrag?.session?.finish?.({
      screenPoint: labelEnd,
      mapPoint: annotations[0].points[1],
    })

    assert.deepEqual(annotations[0].points[0], { x: 20, y: 20 })
    assert.notDeepEqual(annotations[0].points[1], { x: 80, y: 80 })

    const anchorBefore = { ...annotations[0].points[0] }
    const anchorStart = mapPointToCanvas(anchorBefore, bounds, settings)
    const anchorDrag = createTool().begin({
      screenPoint: anchorStart,
      mapPoint: anchorBefore,
    })
    const anchorEnd = { x: anchorStart.x + 25, y: anchorStart.y }
    anchorDrag?.session?.finish?.({
      screenPoint: anchorEnd,
      mapPoint: anchorBefore,
    })

    assert.notDeepEqual(annotations[0].points[0], anchorBefore)
    assert.equal(committed.length, 2)
    assert.equal(labelDrag?.session?.id, 'figure-object:leader-1')
    assert.equal(anchorDrag?.session?.id, 'figure-object:leader-1')
  })

  it('selects locked callouts without dragging and ignores hidden leaders', () => {
    const settings = createDefaultFigureSettings()
    const bounds: Bounds = { x0: 0, y0: 0, x1: 100, y1: 100 }
    const annotation: MapAnnotation = {
      id: 'leader-locked',
      kind: 'leader',
      points: [
        { x: 20, y: 20 },
        { x: 80, y: 80 },
      ],
      text: 'Locked',
      color: '#111111',
      fillColor: '#ffffff',
      lineWidth: 2,
      fontSize: 18,
      rotation: 0,
      dashed: false,
      background: true,
      locked: true,
      leaderVisible: false,
    }
    const label = mapPointToCanvas(annotation.points[1], bounds, settings)
    const selected: Array<string | null> = []
    const tool = createAnnotationMapTool({
      tool: 'select',
      annotations: [annotation],
      annotationStart: null,
      defaults: {
        text: 'Note',
        color: '#111111',
        fillColor: '#ffffff',
        lineWidth: 2,
        fontSize: 18,
        rotation: 0,
        dashed: false,
        background: true,
        resultField: 'summary',
      },
      scene: {} as WseDifferenceScene,
      engine: {} as HydraulicEngine,
      bounds,
      settings,
      setAnnotations: () => {},
      commitAnnotationChange: () => {},
      setSelectedId: (id) => selected.push(id),
      setAnnotationStart: () => {},
      showPlacedAnnotation: () => {},
      setDragging: () => {},
      createAnnotation: () => annotation,
      appendNotices: () => {},
    })

    const started = tool.begin({
      screenPoint: label,
      mapPoint: annotation.points[1],
    })
    const segment = mapPointToCanvas({ x: 50, y: 50 }, bounds, settings)

    assert.equal(started?.handled, true)
    assert.equal(started?.session, undefined)
    assert.equal(selected.at(-1), annotation.id)
    assert.equal(
      hitTestAnnotation(
        [annotation],
        bounds,
        settings,
        segment.x,
        segment.y,
      ),
      null,
    )
  })
})
