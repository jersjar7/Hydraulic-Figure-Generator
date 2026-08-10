export type FigureCoordinateSpace = 'map' | 'plot' | 'frame'

export type FigureObjectPoint = Readonly<{
  x: number
  y: number
}>

export type FigureObjectBounds = Readonly<{
  left: number
  top: number
  right: number
  bottom: number
}>

export type FigureObjectAnchor = Readonly<{
  pointIndex: number
  fixed: boolean
}>

export type FigureObjectLeader = Readonly<{
  visible: boolean
  fromPointIndex: number
  toPointIndex: number
}>

export type FigureObject<Kind extends string = string> = Readonly<{
  id: string
  kind: Kind
  coordinateSpace: FigureCoordinateSpace
  visible: boolean
  locked: boolean
  zIndex: number
  points: readonly FigureObjectPoint[]
  bounds?: FigureObjectBounds
  anchor?: FigureObjectAnchor
  leader?: FigureObjectLeader
}>

export type FigureObjectDragTarget =
  | Readonly<{ type: 'body' }>
  | Readonly<{ type: 'point'; pointIndex: number }>

export type FigureObjectSelection = Readonly<{
  selectedId: string | null
}>
