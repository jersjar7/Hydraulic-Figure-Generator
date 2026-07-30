import { expect, test } from '@playwright/test'
import { join } from 'node:path'

const h5Fixture = (name: string) =>
  join(process.cwd(), 'tests', 'fixtures', 'h5', name)

test('shared figure workspace exposes scalable project and settings navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('.')

  await expect(
    page.getByRole('heading', { name: 'Hydraulic Figure Generator' }),
  ).toBeVisible()
  await expect(page.getByText('FRA workspace · WSE Difference')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Build a WSE Difference figure' }),
  ).toBeVisible()

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

  await page.getByLabel('Figure type').selectOption(
    'fra-cross-section-comparison',
  )
  await expect(page.getByText('FRA workspace · Cross-Section Comparison')).toBeVisible()
  await expect(page.getByLabel('EX scenario name')).toBeVisible()
  await expect(page.getByLabel('PR scenario name')).toBeVisible()

  const selectionMap = page.getByLabel('Cross-section selection map')
  await expect(selectionMap).toHaveClass(/is-visible/)
  await page.getByRole('button', { name: 'Draw manual section' }).click()
  const box = await selectionMap.boundingBox()
  expect(box).not.toBeNull()
  await selectionMap.click({
    position: { x: box!.width * 0.32, y: box!.height * 0.5 },
  })
  await selectionMap.click({
    position: { x: box!.width * 0.68, y: box!.height * 0.5 },
  })

  const generate = page.getByTestId('generate-cross-section')
  await expect(generate).toBeEnabled()
  await generate.click()

  const chart = page.getByLabel(
    'Generated hydraulic cross-section comparison',
  )
  await expect(chart).toHaveClass(/is-visible/)
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
})
