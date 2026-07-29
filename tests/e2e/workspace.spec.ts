import { expect, test } from '@playwright/test'

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
