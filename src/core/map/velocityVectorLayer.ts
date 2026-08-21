import type {
  VelocityVectorData,
  VelocityVectorSettings,
} from '../types'

export type VelocityVectorSample = {
  x: number
  y: number
  vx: number
  vy: number
  magnitude: number
}

type Candidate = VelocityVectorSample & { bucket: string }

export function velocityVectorSamples(
  localX: Float64Array,
  localY: Float64Array,
  vectors: VelocityVectorData,
  settings: VelocityVectorSettings,
  dryDepth: number,
) {
  const spacing = Math.max(8, settings.spacing)
  const selected = new Map<string, Candidate>()
  const count = Math.min(
    localX.length,
    localY.length,
    vectors.vx.length,
    vectors.vy.length,
    vectors.depth?.length ?? Number.POSITIVE_INFINITY,
  )

  for (let index = 0; index < count; index += 1) {
    const vx = vectors.vx[index]
    const vy = vectors.vy[index]
    const depth = vectors.depth?.[index]
    if (
      !Number.isFinite(vx) ||
      !Number.isFinite(vy) ||
      Math.abs(vx) >= 900 ||
      Math.abs(vy) >= 900 ||
      (depth !== undefined && (!Number.isFinite(depth) || depth <= dryDepth))
    ) {
      continue
    }
    const magnitude = Math.hypot(vx, vy)
    if (!Number.isFinite(magnitude) || magnitude <= settings.minimumMagnitude) {
      continue
    }
    const x = localX[index]
    const y = localY[index]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const bucket = `${Math.floor(x / spacing)}:${Math.floor(y / spacing)}`
    const current = selected.get(bucket)
    if (!current || magnitude > current.magnitude) {
      selected.set(bucket, { bucket, x, y, vx, vy, magnitude })
    }
  }

  return [...selected.values()].map(({ bucket: _bucket, ...sample }) => sample)
}

function drawArrow(
  context: CanvasRenderingContext2D,
  sample: VelocityVectorSample,
  vectors: VelocityVectorData,
  settings: VelocityVectorSettings,
) {
  const ratio = settings.lengthMode === 'scaled' && vectors.maxMagnitude > 0
    ? Math.max(0.12, Math.min(1, sample.magnitude / vectors.maxMagnitude))
    : 1
  const length = settings.length * ratio
  const unitX = sample.vx / sample.magnitude
  const unitY = -sample.vy / sample.magnitude
  const tailX = sample.x - unitX * length * 0.5
  const tailY = sample.y - unitY * length * 0.5
  const headX = sample.x + unitX * length * 0.5
  const headY = sample.y + unitY * length * 0.5
  const headSize = Math.min(settings.headSize, length * 0.45)
  const angle = Math.atan2(headY - tailY, headX - tailX)

  context.beginPath()
  context.moveTo(tailX, tailY)
  context.lineTo(headX, headY)
  context.moveTo(headX, headY)
  context.lineTo(
    headX - headSize * Math.cos(angle - Math.PI / 6),
    headY - headSize * Math.sin(angle - Math.PI / 6),
  )
  context.moveTo(headX, headY)
  context.lineTo(
    headX - headSize * Math.cos(angle + Math.PI / 6),
    headY - headSize * Math.sin(angle + Math.PI / 6),
  )
  context.stroke()
}

export function drawVelocityVectors(
  context: CanvasRenderingContext2D,
  localX: Float64Array,
  localY: Float64Array,
  vectors: VelocityVectorData,
  settings: VelocityVectorSettings,
  dryDepth: number,
) {
  if (!settings.visible) return
  const samples = velocityVectorSamples(
    localX,
    localY,
    vectors,
    settings,
    dryDepth,
  )
  context.save()
  context.strokeStyle = settings.color
  context.lineWidth = settings.lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.setLineDash([])
  for (const sample of samples) {
    drawArrow(context, sample, vectors, settings)
  }
  context.restore()
}
