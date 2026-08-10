import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CartographyPanel } from '../../src/features/cartography/CartographyPanel'
import type { CartographySettings } from '../../src/core/types'

const wseValue: CartographySettings = {
  classification: {
    ramp: 'wseDifference',
    bounds: { mode: 'symmetric', bound: 3 },
    interval: 0.5,
  },
  contours: {
    visible: true,
    mode: 'class-boundaries',
    interval: null,
    color: '#111111',
    width: 1.5,
    pattern: 'solid',
  },
  mesh: null,
}

function Harness({ initial = wseValue }: { initial?: CartographySettings }) {
  const [value, setValue] = useState(initial)
  return (
    <CartographyPanel
      value={value}
      defaultRamp={value.classification.ramp}
      units="ft"
      onChange={setValue}
    />
  )
}

describe('CartographyPanel', () => {
  it('edits symmetric WSE classes and class-boundary line styles', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Class boundary outlines')).toBeChecked()
    expect(screen.queryByLabelText(/Contour interval/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Bound/), { target: { value: '4' } })
    expect(screen.getByLabelText(/Bound/)).toHaveValue(4)
    fireEvent.change(screen.getByLabelText('Pattern'), {
      target: { value: 'dashed' },
    })
    expect(screen.getByLabelText('Pattern')).toHaveValue('dashed')
  })

  it('presents ranged scalar isolines and optional mesh controls', () => {
    render(<Harness initial={{
      classification: {
        ramp: 'depth',
        bounds: { mode: 'range', minimum: 0, maximum: 8 },
        interval: 1,
      },
      contours: {
        visible: true,
        mode: 'scalar-isolines',
        interval: 0.5,
        color: '#222222',
        width: 1,
        pattern: 'solid',
      },
      mesh: {
        color: '#333333',
        width: 0.75,
        opacity: 0.65,
        pattern: 'dotted',
      },
    }} />)
    expect(screen.getByLabelText('Scalar isolines')).toBeChecked()
    expect(screen.getByLabelText(/Contour interval/)).toHaveValue(0.5)
    expect(screen.getByRole('heading', { name: 'Mesh' })).toBeVisible()
    expect(screen.getAllByLabelText('Pattern')).toHaveLength(2)
  })
})
