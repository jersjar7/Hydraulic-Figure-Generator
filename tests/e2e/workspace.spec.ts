import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const h5Fixture = (name: string) =>
  join(process.cwd(), 'tests', 'fixtures', 'h5', name)
const shapefileFixture = (name: string) =>
  join(process.cwd(), 'tests', 'fixtures', 'shapefiles', name)

const PROFILE_SUMMARY = [
  'Reach\tStation\tMin',
  'Hood Canal\t1047.09\t52.00',
].join('\n')

const PROFILE_VALUES = [
  'Distance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue',
  '1\t0\t58\t0\t57\t0\t56\t0\t60\t0\t59',
  '2\t10\t55\t10\t57\t10\t56\t10\t60\t10\t59',
  '3\t20\t52\t20\t57\t20\t56\t20\t60\t20\t59',
  '4\t30\t55\t30\t57\t30\t56\t30\t60\t30\t59',
  '5\t40\t58\t40\t57\t40\t56\t40\t60\t40\t59',
].join('\n')

test('shared figure workspace exposes scalable project and settings navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('.')

  await expect(
    page.getByRole('heading', { name: 'Hydraulic Figure Generator' }),
  ).toBeVisible()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'fra-wse-difference',
  )
  await expect(
    page.getByRole('heading', { name: 'Build a WSE Difference figure' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Generate map', exact: true }),
  ).toHaveCount(1)

  await page.getByRole('tab', { name: /layers/i }).click()
  await expect(
    page.getByText('Add zipped shapefiles', { exact: false }),
  ).toBeVisible()

  await page.getByRole('tab', { name: /map/i }).click()
  await expect(page.getByText('Dry-depth threshold')).toBeVisible()
  await page.getByRole('tab', { name: /export/i }).click()
  await expect(
    page.getByRole('button', { name: /download map png/i }),
  ).toBeVisible()
})

test('mobile controls keep both sidebars reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('.')

  await page.getByRole('button', { name: 'Open project data' }).click()
  await expect(
    page.getByRole('heading', { name: 'Project workflow' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close project workflow' }).click()

  await page.getByRole('button', { name: 'Open figure settings' }).click()
  await expect(
    page.getByRole('heading', { name: 'Figure settings' }),
  ).toBeVisible()
})

test('SMS profile paste maps, renders, and assembles one fitted station cross section', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'hydraulic-profiles-sections',
  )
  await expect(
    page.getByRole('button', { name: 'Generate cross section', exact: true }),
  ).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Proposed', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByPlaceholder('Auto')).toHaveCount(0)

  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await page.getByLabel('SMS Summary Table').fill(PROFILE_SUMMARY)
  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await page.getByLabel('SMS Profile Values').fill(PROFILE_VALUES)
  await expect(page.getByText('1 cross sections detected')).toBeVisible()

  await page.getByRole('tab', { name: 'Review', exact: true }).click()
  await expect(page.getByLabel('Profile station')).toHaveValue(
    'profile-section-1',
  )
  await expect(page.getByLabel('Dataset 5 type')).toBeVisible()
  await page.getByLabel('Dataset 1 legend name').fill('Proposed Ground')
  await page.getByLabel('Dataset 1 type').selectOption('ground')
  for (const [index, name] of ['2-year', '100-year', '500-year', 'Future 100-year'].entries()) {
    await page.getByLabel(`Dataset ${index + 2} legend name`).fill(name)
    await page.getByLabel(`Dataset ${index + 2} type`).selectOption('wse')
  }
  await page.getByLabel('Station reference dataset').selectOption('0')
  await expect(page.getByLabel('Profile station')).toContainText('10+47')

  await page.getByTestId('generate-hydraulic-profile').click()
  const canvas = page.getByLabel('Generated SMS hydraulic profile')
  await expect(canvas).toHaveClass(/is-visible/)
  const fit = await canvas.evaluate((element) => {
    const chart = element.getBoundingClientRect()
    const frame = element.parentElement!.getBoundingClientRect()
    return {
      fits: chart.width <= frame.width && chart.height <= frame.height,
      ratio: chart.width / chart.height,
      centerDeltaX: Math.abs(
        chart.left + chart.width / 2 - (frame.left + frame.width / 2),
      ),
      centerDeltaY: Math.abs(
        chart.top + chart.height / 2 - (frame.top + frame.height / 2),
      ),
    }
  })
  expect(fit.fits).toBe(true)
  expect(Math.abs(fit.ratio - 1500 / 900)).toBeLessThan(0.02)
  expect(fit.centerDeltaX).toBeLessThan(2)
  expect(fit.centerDeltaY).toBeLessThan(2)
  await expect.poll(() => canvas.evaluate((element) => {
    const chart = element as HTMLCanvasElement
    const context = chart.getContext('2d')
    if (!context) return 0
    const pixels = context.getImageData(0, 0, chart.width, chart.height).data
    let colored = 0
    for (let index = 0; index < pixels.length; index += 128) {
      if (
        Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) -
        Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) > 20
      ) colored += 1
    }
    return colored
  })).toBeGreaterThan(100)

  await page.getByRole('tab', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Add to export' }).click()
  await expect(page.getByLabel('Workspace', { exact: true }).locator('option').last()).toHaveText('Export Collection (1)')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/Hydraulic_Profile_10_47\.png/)

  await page.getByLabel('Workspace', { exact: true }).selectOption('report-assembly')
  await expect(page.getByRole('heading', { name: 'Hydraulic Profiles & Sections' })).toBeVisible()
  await page.getByRole('button', { name: /Preview Hydraulic Cross Section/ }).click()
  await page.getByLabel('Caption').fill('Reviewed profile caption.')
  await expect(page.getByLabel('Caption')).toHaveValue('Reviewed profile caption.')
  await page.getByRole('button', { name: 'Close preview' }).click()
  const wordPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Word' }).click()
  expect((await wordPromise).suggestedFilename()).toBe('Hydraulic_Figure_Report.docx')
})

test('synthetic SMS files upload and render a nonblank figure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')

  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      h5Fixture('Existing-Geometry.h5'),
      h5Fixture('Existing-Datasets.h5'),
      h5Fixture('Proposed-Geometry.h5'),
      h5Fixture('Proposed-Datasets.h5'),
    ])

  await expect(page.getByLabel('EX scenario name')).toBeVisible()
  await expect(page.getByLabel('PR scenario name')).toBeVisible()
  await expect(page.getByTestId('generate-map')).toBeEnabled()

  await page.getByRole('tab', { name: 'View', exact: true }).click()
  await page
    .locator('label.range-field')
    .filter({ hasText: 'Aerial opacity' })
    .locator('input')
    .fill('0')
  await page.getByTestId('generate-map').click()

  const canvas = page.getByLabel('Generated WSE difference figure')
  await expect(canvas).toHaveClass(/is-visible/)
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const map = element as HTMLCanvasElement
        const context = map.getContext('2d')
        if (!context || map.width === 0 || map.height === 0) return 0
        const pixels = context.getImageData(
          0,
          0,
          map.width,
          map.height,
        ).data
        let colored = 0
        for (let index = 0; index < pixels.length; index += 128) {
          const red = pixels[index]
          const green = pixels[index + 1]
          const blue = pixels[index + 2]
          if (
            Math.max(red, green, blue) -
              Math.min(red, green, blue) >
            20
          ) {
            colored += 1
          }
        }
        return colored
      }),
    )
    .toBeGreaterThan(100)
})

test('loaded scenarios carry into the cross-section map-to-chart workflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')

  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      h5Fixture('Existing-Geometry.h5'),
      h5Fixture('Existing-Datasets.h5'),
      h5Fixture('Proposed-Geometry.h5'),
      h5Fixture('Proposed-Datasets.h5'),
    ])

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'fra-cross-section-comparison',
  )
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'fra-cross-section-comparison',
  )
  await expect(
    page.getByRole('button', { name: 'Generate cross section', exact: true }),
  ).toHaveCount(1)
  await expect(page.getByLabel('EX scenario name')).toBeVisible()
  await expect(page.getByLabel('PR scenario name')).toBeVisible()

  const selectionMap = page.getByLabel('Cross-section selection map')
  await expect(selectionMap).toHaveClass(/is-visible/)
  const mapFit = await selectionMap.evaluate((element) => {
    const canvas = element.getBoundingClientRect()
    const frame = element.parentElement!.getBoundingClientRect()
    return {
      ratio: canvas.width / canvas.height,
      fits:
        canvas.width <= frame.width &&
        canvas.height <= frame.height,
      centerDeltaX: Math.abs(
        canvas.left + canvas.width / 2 - (frame.left + frame.width / 2),
      ),
      centerDeltaY: Math.abs(
        canvas.top + canvas.height / 2 - (frame.top + frame.height / 2),
      ),
    }
  })
  expect(mapFit.fits).toBe(true)
  expect(Math.abs(mapFit.ratio - 1650 / 1275)).toBeLessThan(0.02)
  expect(mapFit.centerDeltaX).toBeLessThan(2)
  expect(mapFit.centerDeltaY).toBeLessThan(2)

  await page.getByRole('button', { name: 'Draw manual section' }).click()
  await expect(page.getByText('Click endpoint A · Esc to cancel')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Draw manual section' }),
  ).toBeVisible()
  await expect(
    page.getByText('Click endpoint A · Esc to cancel'),
  ).not.toBeVisible()

  await page.getByRole('button', { name: 'Draw manual section' }).click()
  const box = await selectionMap.boundingBox()
  expect(box).not.toBeNull()
  await selectionMap.click({
    position: { x: box!.width * 0.32, y: box!.height * 0.5 },
  })
  await expect(page.getByText('Endpoint A set')).toBeVisible()
  await selectionMap.click({
    position: { x: box!.width * 0.68, y: box!.height * 0.5 },
  })
  await expect(page.getByTestId('selected-section-card')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Reverse A/B' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Flip look arrow' }),
  ).toBeVisible()

  const generate = page.getByTestId('generate-cross-section')
  await expect(generate).toBeEnabled()
  await generate.click()

  const chart = page.getByLabel(
    'Generated hydraulic cross-section comparison',
  )
  await expect(chart).toHaveClass(/is-visible/)
  const chartFit = await chart.evaluate((element) => {
    const canvas = element.getBoundingClientRect()
    const frame = element.parentElement!.getBoundingClientRect()
    return {
      ratio: canvas.width / canvas.height,
      fits:
        canvas.width <= frame.width &&
        canvas.height <= frame.height,
      centerDeltaX: Math.abs(
        canvas.left + canvas.width / 2 - (frame.left + frame.width / 2),
      ),
      centerDeltaY: Math.abs(
        canvas.top + canvas.height / 2 - (frame.top + frame.height / 2),
      ),
    }
  })
  expect(chartFit.fits).toBe(true)
  expect(Math.abs(chartFit.ratio - 1500 / 900)).toBeLessThan(0.02)
  expect(chartFit.centerDeltaX).toBeLessThan(2)
  expect(chartFit.centerDeltaY).toBeLessThan(2)
  await expect
    .poll(() =>
      chart.evaluate((element) => {
        const canvas = element as HTMLCanvasElement
        const context = canvas.getContext('2d')
        if (!context || canvas.width === 0 || canvas.height === 0) return 0
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        let dark = 0
        for (let index = 0; index < pixels.length; index += 128) {
          if (pixels[index] + pixels[index + 1] + pixels[index + 2] < 450) {
            dark += 1
          }
        }
        return dark
      }),
    )
    .toBeGreaterThan(100)

  await page.getByRole('tab', { name: 'Select line' }).click()
  await page
    .getByRole('button', { name: 'Remove selected section' })
    .click()
  await expect(page.getByTestId('selected-section-card')).not.toBeVisible()
  await expect(generate).toBeDisabled()
})

test('one SMS scenario renders a fitted plan-view scalar result map', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'plan-view-hydraulic-results',
  )
  await expect(
    page.getByRole('button', { name: 'Generate map', exact: true }),
  ).toHaveCount(1)
  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      h5Fixture('Existing-Geometry.h5'),
      h5Fixture('Existing-Datasets.h5'),
    ])

  await expect(page.getByLabel('EX scenario name')).toBeVisible()
  await expect(page.getByText('Scenario', { exact: true })).toBeVisible()
  await expect(page.getByText('Comparison', { exact: true })).not.toBeVisible()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'plan-view-hydraulic-results',
  )
  await expect(page.getByTestId('generate-plan-view')).toBeEnabled()

  await page.getByRole('tab', { name: 'Frame', exact: true }).click()
  await page
    .locator('label.range-field')
    .filter({ hasText: 'Aerial opacity' })
    .locator('input')
    .fill('0')
  await page.getByTestId('generate-plan-view').click()

  const canvas = page.getByLabel(
    'Generated plan-view hydraulic result figure',
  )
  await expect(canvas).toHaveClass(/is-visible/)
  const fit = await canvas.evaluate((element) => {
    const map = element.getBoundingClientRect()
    const frame = element.parentElement!.getBoundingClientRect()
    return {
      fits: map.width <= frame.width && map.height <= frame.height,
      ratio: map.width / map.height,
      centerDeltaX: Math.abs(
        map.left + map.width / 2 - (frame.left + frame.width / 2),
      ),
      centerDeltaY: Math.abs(
        map.top + map.height / 2 - (frame.top + frame.height / 2),
      ),
    }
  })
  expect(fit.fits).toBe(true)
  expect(Math.abs(fit.ratio - 1650 / 1275)).toBeLessThan(0.02)
  expect(fit.centerDeltaX).toBeLessThan(2)
  expect(fit.centerDeltaY).toBeLessThan(2)
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const map = element as HTMLCanvasElement
        const context = map.getContext('2d')
        if (!context || map.width === 0 || map.height === 0) return 0
        const pixels = context.getImageData(0, 0, map.width, map.height).data
        let colored = 0
        for (let index = 0; index < pixels.length; index += 128) {
          if (
            Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) -
              Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) >
            20
          ) colored += 1
        }
        return colored
      }),
    )
    .toBeGreaterThan(100)
})

test('Plan-View loads a zipped centerline and renders station ticks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      h5Fixture('Existing-Geometry.h5'),
      h5Fixture('Existing-Datasets.h5'),
    ])

  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  await page
    .getByTestId('overlay-file-drop')
    .locator('input[type="file"]')
    .setInputFiles(
      shapefileFixture('Synthetic-Centerline.zip'),
    )
  await expect(page.getByText('Synthetic-Centerline', { exact: true }))
    .toBeVisible()
  await page.getByText('Show shapefile overlays', { exact: true }).click()

  await page.getByRole('tab', { name: 'Stationing', exact: true }).click()
  await page.getByLabel('Centerline feature').selectOption({
    label: 'Synthetic-Centerline',
  })
  const settingsPanel = page.locator('.right-sidebar')
  await settingsPanel.getByText('Show on figure', { exact: true }).click()
  await settingsPanel.locator('input[type="color"]').first().fill('#ff00ff')
  await settingsPanel.getByRole('button', { name: '25 / 100' }).click()
  await page.getByTestId('generate-plan-view').click()

  const canvas = page.getByLabel(
    'Generated plan-view hydraulic result figure',
  )
  await expect(canvas).toHaveClass(/is-visible/)
  await expect.poll(() => canvas.evaluate((element) => {
    const map = element as HTMLCanvasElement
    const context = map.getContext('2d')
    if (!context) return 0
    const pixels = context.getImageData(0, 0, map.width, map.height).data
    let magenta = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (
        pixels[index] > 220 &&
        pixels[index + 1] < 45 &&
        pixels[index + 2] > 220
      ) magenta += 1
    }
    return magenta
  })).toBeGreaterThan(20)
})

test('Plan-View renders topography, mesh, and combined geometry outputs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([h5Fixture('Existing-Geometry.h5')])

  const mapContent = page.getByLabel('Map content')
  await expect(mapContent).toContainText('Topography')
  await expect(mapContent).toContainText('Mesh Elements')
  await expect(mapContent).toContainText('Topography + Mesh Elements')

  await page.getByRole('tab', { name: 'Frame', exact: true }).click()
  await page
    .locator('label.range-field')
    .filter({ hasText: 'Aerial opacity' })
    .locator('input')
    .fill('0')

  for (const value of [
    '__topography__',
    '__mesh_elements__',
    '__topography_mesh_elements__',
  ]) {
    await page.getByRole('tab', { name: 'Result', exact: true }).click()
    await mapContent.selectOption(value)
    await expect(page.getByTestId('generate-plan-view')).toBeEnabled()
    await page.getByTestId('generate-plan-view').click()
    await expect(
      page.getByLabel('Generated plan-view hydraulic result figure'),
    ).toHaveClass(/is-visible/)
  }
})

test('Plan-View builds and reviews a multi-result figure set', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await page
    .getByTestId('h5-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      h5Fixture('Existing-Geometry.h5'),
      h5Fixture('Existing-Datasets.h5'),
    ])
  await expect(page.getByTestId('generate-plan-view')).toBeEnabled()

  await page.getByRole('tab', { name: 'Frame', exact: true }).click()
  await page
    .locator('label.range-field')
    .filter({ hasText: 'Aerial opacity' })
    .locator('input')
    .fill('0')
  await page.getByRole('tab', { name: 'Figure Set', exact: true }).click()

  const figureSetPanel = page.locator('.right-sidebar')
  await expect(figureSetPanel.getByText('1 figure selected')).toBeVisible()
  await page.getByRole('checkbox', { name: /Water Surface Elevation/ }).check()
  await page.getByRole('checkbox', {
    name: 'Topography geometry output',
    exact: true,
  }).check()
  await expect(figureSetPanel.getByText('3 figures selected')).toBeVisible()
  await page.getByTestId('generate-figure-set').click()

  await expect(page.locator('.figure-set-status.ready')).toHaveCount(3, {
    timeout: 15_000,
  })
  await expect(page.getByText('3 ready · 3 included · 3 total')).toBeVisible()

  await page.getByRole('tab', { name: 'Document', exact: true }).click()
  await expect(page.getByText('3 pages · one figure per page')).toBeVisible()
  await page.getByRole('spinbutton', { name: 'Start number' }).fill('10')
  await expect(page.getByText(/^Figure 10\./)).toBeVisible()
  await page.getByRole('textbox', { name: 'Caption', exact: true }).fill(
    'Existing-condition water depth.',
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-figure-document').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.docx$/)
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error('Word download did not produce a local file.')
  const bytes = await readFile(downloadPath)
  expect(bytes.subarray(0, 2).toString()).toBe('PK')

  await page.getByRole('tab', { name: 'Figure Set', exact: true }).click()
  await page.getByRole('button', { name: /Open figure 1:/ }).click()
  await expect(page.getByRole('tab', { name: 'Figure', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    page.getByLabel('Generated plan-view hydraulic result figure'),
  ).toHaveClass(/is-visible/)
})
