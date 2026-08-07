import { expect, test, type Page } from '@playwright/test'
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

const SHUFFLED_GROUND_PROFILE_VALUES = [
  'Distance\tValue\tDistance\tValue\tDistance\tValue\tDistance\tValue',
  '1\t0\t30\t0\t29\t0\t27\t0\t28',
  '2\t10\t30\t10\t25\t10\t27\t10\t28',
  '3\t20\t30\t20\t29\t20\t27\t20\t28',
].join('\n')

const TWO_SECTION_PROFILE_SUMMARY = [
  'Reach\tStation\tMin',
  'Site\t100\t20',
  'Site\t200\t30',
].join('\n')

const TWO_SECTION_PROFILE_VALUES = [
  Array.from({ length: 10 }, () => ['Distance', 'Value']).flat().join('\t'),
  [1, 0, 30, 0, 21, 0, 22, 0, 23, 0, 24, 0, 40, 0, 31, 0, 32, 0, 33, 0, 34].join('\t'),
  [2, 10, 20, 10, 21, 10, 22, 10, 23, 10, 24, 10, 30, 10, 31, 10, 32, 10, 33, 10, 34].join('\t'),
  [3, 20, 30, 20, 21, 20, 22, 20, 23, 20, 24, 20, 40, 20, 31, 20, 32, 20, 33, 20, 34].join('\t'),
].join('\n')

async function continueWithoutProject(page: Page) {
  await page.getByRole('button', { name: 'Continue without a project' }).click()
}

async function openHydraulicProfiles(page: Page) {
  await continueWithoutProject(page)
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
}

test('shared figure workspace exposes scalable project and settings navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('.')
  await expect(page.getByRole('heading', { name: 'Start a project' })).toBeVisible()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveCount(0)
  await continueWithoutProject(page)
  await expect(page.getByLabel('Workspace', { exact: true }).locator('option')).toHaveText([
    'Cross-Section Comparison',
    'Export Collection (0)',
    'Hydraulic Profiles & Sections',
    'Plan-View Hydraulic Results',
    'WSE Difference',
  ])

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
  await continueWithoutProject(page)

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

test('figure workspace drafts survive navigation through the Export Collection', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await continueWithoutProject(page)

  await page.getByRole('tab', { name: /map/i }).click()
  await page.getByLabel('Dry-depth threshold').fill('0.27')

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
  await page.getByLabel('Condition label').fill('Retained profile draft')

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'fra-cross-section-comparison',
  )
  await page.getByLabel('Section name').fill('Retained section draft')

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await page.getByRole('tab', { name: /frame/i }).click()
  await page.getByRole('button', { name: 'Portrait' }).click()

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'report-assembly',
  )
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'fra-wse-difference',
  )
  await page.getByRole('tab', { name: /map/i }).click()
  await expect(page.getByLabel('Dry-depth threshold')).toHaveValue('0.27')

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
  await expect(page.getByLabel('Condition label')).toHaveValue(
    'Retained profile draft',
  )

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'fra-cross-section-comparison',
  )
  await expect(page.getByLabel('Section name')).toHaveValue(
    'Retained section draft',
  )

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'plan-view-hydraulic-results',
  )
  await page.getByRole('tab', { name: /frame/i }).click()
  await expect(page.getByRole('button', { name: 'Portrait' })).toHaveClass(
    /active/,
  )
})

test('folder project saves and restores profiles with the Export Collection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    type MemoryFile = { name: string; contents: string }
    type MemoryDirectory = {
      name: string
      children: Map<string, MemoryDirectory>
      files: Map<string, MemoryFile>
      getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectory>
      getFileHandle(name: string, options?: { create?: boolean }): Promise<{
        getFile(): Promise<File>
        createWritable(): Promise<{
          write(contents: string): Promise<void>
          close(): Promise<void>
        }>
      }>
    }
    const makeDirectory = (directoryName: string): MemoryDirectory => {
      const directory: MemoryDirectory = {
        name: directoryName,
        children: new Map(),
        files: new Map(),
        async getDirectoryHandle(name, options) {
          const existing = directory.children.get(name)
          if (existing) return existing
          if (!options?.create) throw new DOMException('Missing directory', 'NotFoundError')
          const child = makeDirectory(name)
          directory.children.set(name, child)
          return child
        },
        async getFileHandle(name, options) {
          let record = directory.files.get(name)
          if (!record && !options?.create) throw new DOMException('Missing file', 'NotFoundError')
          record ??= { name, contents: '' }
          directory.files.set(name, record)
          return {
            getFile: async () => new File([record.contents], record.name, { type: 'text/plain' }),
            createWritable: async () => ({
              write: async (contents: string) => { record.contents = contents },
              close: async () => undefined,
            }),
          }
        },
      }
      return directory
    }
    const root = makeDirectory('Projects')
    ;(window as Window & {
      showDirectoryPicker?: (options: { id: string }) => Promise<MemoryDirectory>
    }).showDirectoryPicker = async ({ id }) => {
      if (id.length > 32) {
        throw new TypeError('Directory picker IDs cannot exceed 32 characters.')
      }
      if (id.includes('new-project')) return root
      const project = [...root.children.values()][0]
      if (!project) throw new DOMException('Missing project', 'NotFoundError')
      return project
    }
  })

  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await expect(page.getByRole('heading', { name: 'Start a project' })).toBeVisible()
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Project name').fill('Site 6 FRA')
  await page.getByRole('button', { name: 'Choose location' }).click()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'fra-wse-difference',
  )
  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
  await expect(page.getByLabel('Site 6 FRA: Unsaved changes')).toBeVisible()

  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await page.getByLabel('SMS Summary Table').fill(PROFILE_SUMMARY)
  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await page.getByLabel('SMS Profile Values').fill(PROFILE_VALUES)
  await expect(page.getByLabel('Site 6 FRA: Unsaved changes')).toBeVisible()
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })).toBe(true)

  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByLabel('Site 6 FRA: Saved')).toBeVisible()

  await page.getByLabel('Workspace', { exact: true }).selectOption('report-assembly')
  await expect(page.getByLabel('Site 6 FRA: Unsaved changes')).toBeVisible()
  await page.getByLabel('Document title').fill('Site 6 Hydraulic Report')
  await expect(page.getByLabel('Site 6 FRA: Unsaved changes')).toBeVisible()
  await page.getByRole('button', { name: 'Save project' }).click()
  await expect(page.getByLabel('Site 6 FRA: Saved')).toBeVisible()
  await page.getByLabel('Document title').fill('Temporary Report')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Open project' }).click()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue('report-assembly')
  await expect(page.getByLabel('Document title')).toHaveValue('Site 6 Hydraulic Report')
  await expect(page.getByLabel('Site 6 FRA: Saved')).toBeVisible()

  await page.getByLabel('Workspace', { exact: true }).selectOption(
    'hydraulic-profiles-sections',
  )
  await expect(page.getByLabel('Condition label')).toHaveValue('Proposed Conditions')
  await expect(page.getByLabel('Site 6 FRA: Unsaved changes')).toBeVisible()
  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await expect(page.getByLabel('SMS Summary Table')).toHaveValue(PROFILE_SUMMARY)
  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await expect(page.getByLabel('SMS Profile Values')).toHaveValue(PROFILE_VALUES)
  await expect(page.getByLabel('Generated SMS hydraulic profile')).toHaveClass(/is-visible/)
})

test('SMS profile paste maps, renders, and assembles one fitted station cross section', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await openHydraulicProfiles(page)
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'hydraulic-profiles-sections',
  )
  await expect(
    page.getByRole('button', { name: 'Generate cross sections', exact: true }),
  ).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Proposed', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByPlaceholder('Auto')).toHaveCount(0)
  await expect(page.getByLabel('WSE extent')).toHaveValue('clip')

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
  await page.getByLabel('Station-order ground').selectOption('0')
  await expect(page.getByLabel('Profile station')).toContainText('10+47')

  await page.getByTestId('generate-hydraulic-profile').click()
  const canvas = page.getByLabel('Generated SMS hydraulic profile')
  await expect(canvas).toHaveClass(/is-visible/)
  await expect(page.getByRole('navigation', { name: 'Generated cross sections' })).toBeVisible()
  await expect(page.getByText('1 of 1')).toBeVisible()
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
  await page.getByRole('button', { name: 'Add current station to export' }).click()
  await expect(page.getByRole('option', { name: 'Export Collection (1)' })).toBeAttached()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PNG' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/Hydraulic_Profile_10_47\.png/)

  await page.getByRole('tab', { name: 'Scenario', exact: true }).click()
  await page.getByLabel('Condition label').fill('Later workspace edit')

  await page.getByLabel('Workspace', { exact: true }).selectOption('report-assembly')
  await expect(page.getByRole('heading', { name: 'Hydraulic Profiles & Sections' })).toBeVisible()
  await page.getByRole('button', { name: /Preview Hydraulic Cross Section/ }).click()
  await page.getByLabel('Caption').fill('Reviewed profile caption.')
  await expect(page.getByLabel('Caption')).toHaveValue('Reviewed profile caption.')
  await page.getByRole('button', { name: 'Close preview' }).click()
  const wordPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Word' }).click()
  expect((await wordPromise).suggestedFilename()).toBe('Hydraulic_Figure_Report.docx')

  await page.getByRole('button', { name: /Preview Hydraulic Cross Section/ }).click()
  await page.getByRole('button', { name: 'Use as starting point' }).click()
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(
    'hydraulic-profiles-sections',
  )
  await expect(page.getByLabel('Condition label')).toHaveValue(
    'Proposed Conditions',
  )
  await page.getByRole('tab', { name: 'Review', exact: true }).click()
  await expect(page.getByLabel('Profile station')).toHaveValue(
    'profile-section-1',
  )
  await page.getByRole('tab', { name: 'Layout', exact: true }).click()
  await page.getByLabel('Figure title').fill('Updated Hydraulic Cross Section')
  await page.getByRole('tab', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Update exported figure' }).click()
  await expect(page.getByRole('option', { name: 'Export Collection (1)' })).toBeAttached()
  await page.getByRole('button', { name: 'Save as new figure' }).click()
  await expect(page.getByRole('option', { name: 'Export Collection (2)' })).toBeAttached()
  await page.getByLabel('Workspace', { exact: true }).selectOption('report-assembly')
  await expect(page.getByRole('button', {
    name: /Preview Updated Hydraulic Cross Section/,
  })).toHaveCount(2)
})

test('SMS Summary and Profile Values text files feed the profile parser', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await openHydraulicProfiles(page)

  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await page.getByTestId('summary-text-file-drop').locator('input[type="file"]').setInputFiles({
    name: 'SummaryTable.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(PROFILE_SUMMARY),
  })
  await expect(page.getByLabel('SMS Summary Table')).toHaveValue(PROFILE_SUMMARY)

  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await page.getByTestId('profile-text-file-drop').locator('input[type="file"]').setInputFiles({
    name: 'ProfileValues.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(PROFILE_VALUES),
  })
  await expect(page.getByLabel('SMS Profile Values')).toHaveValue(PROFILE_VALUES)
  await expect(page.getByText('5 series parsed · 1 cross sections detected')).toBeVisible()
  await expect(page.getByTestId('generate-hydraulic-profile')).toBeEnabled()
})

test('one profile generation exposes every detected station and batch export', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await openHydraulicProfiles(page)

  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await page.getByLabel('SMS Summary Table').fill(TWO_SECTION_PROFILE_SUMMARY)
  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await page.getByLabel('SMS Profile Values').fill(TWO_SECTION_PROFILE_VALUES)
  await expect(page.getByTestId('generate-hydraulic-profile')).toHaveText(
    /^(Re)?generate 2 cross sections$/,
  )

  await page.getByTestId('generate-hydraulic-profile').click()
  await expect(page.getByRole('tab', { name: '1+00' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('1 of 2')).toBeVisible()

  await page.getByRole('tab', { name: '2+00' }).click()
  await expect(page.getByRole('tab', { name: '2+00' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('2 of 2')).toBeVisible()
  await expect(page.getByTestId('generate-hydraulic-profile')).toHaveText('Regenerate 2 cross sections')

  await page.getByRole('tab', { name: 'Export', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Add all 2 stations to export' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add current station to export' })).toBeVisible()
})

test('profile generation waits for review when the detected ground is in another dataset slot', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await openHydraulicProfiles(page)
  await page.getByRole('button', { name: 'Existing', exact: true }).click()

  await page.getByRole('tab', { name: 'Summary', exact: true }).click()
  await page.getByLabel('SMS Summary Table').fill('Reach\tStation\tMin\nSite\t100\t25')
  await page.getByRole('tab', { name: 'Profile', exact: true }).click()
  await page.getByLabel('SMS Profile Values').fill(SHUFFLED_GROUND_PROFILE_VALUES)

  const generate = page.getByTestId('generate-hydraulic-profile')
  await expect(generate).toBeDisabled()
  await expect(page.getByText('Review the dataset mapping before generating')).toBeVisible()

  await page.getByRole('tab', { name: 'Review', exact: true }).click()
  await expect(page.getByText(/Dataset 2 is lowest in/)).toBeVisible()
  await expect(page.getByLabel('Station-order ground')).toHaveValue('')
  await page.getByRole('button', { name: 'Apply Dataset 2 mapping' }).click()
  await expect(page.getByLabel('Station-order ground')).toHaveValue('1')
  await expect(page.getByLabel('Dataset 1 legend name')).toHaveValue('500-year')
  await expect(page.getByLabel('Dataset 1 type')).toHaveValue('wse')
  await expect(page.getByLabel('Dataset 2 legend name')).toHaveValue('Existing Ground')
  await expect(page.getByLabel('Dataset 2 type')).toHaveValue('ground')
  await expect(page.getByLabel('Dataset 3 legend name')).toHaveValue('2-year')
  await expect(page.getByLabel('Dataset 4 legend name')).toHaveValue('100-year')
  await expect(generate).toBeEnabled()

  await generate.click()
  await expect(page.getByLabel('Generated SMS hydraulic profile')).toHaveClass(/is-visible/)
})

test('synthetic SMS files upload and render a nonblank figure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('.')
  await continueWithoutProject(page)

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

  await page.getByRole('tab', { name: 'Layers', exact: true }).click()
  const wseCenterlineArchive = await readFile(
    shapefileFixture('Synthetic-Centerline.zip'),
  )
  await page
    .getByTestId('overlay-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      {
        name: 'Synthetic-Centerline.zip',
        mimeType: 'application/zip',
        buffer: wseCenterlineArchive,
      },
      {
        name: 'Synthetic-Tributary.zip',
        mimeType: 'application/zip',
        buffer: wseCenterlineArchive,
      },
    ])
  await page.getByRole('tab', { name: 'Stationing', exact: true }).click()
  const stationingSources = page.getByRole('group', {
    name: 'Centerlines on figure',
  })
  const centerlines = await stationingSources.getByRole('checkbox').all()
  expect(centerlines).toHaveLength(2)
  for (const centerline of centerlines) await centerline.check()
  await expect(page.getByLabel('Edit stationing for')).toBeEnabled()

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
  await continueWithoutProject(page)

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
  await continueWithoutProject(page)
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
  await continueWithoutProject(page)
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
  const centerlineArchive = await readFile(
    shapefileFixture('Synthetic-Centerline.zip'),
  )
  await page
    .getByTestId('overlay-file-drop')
    .locator('input[type="file"]')
    .setInputFiles([
      {
        name: 'Synthetic-Centerline.zip',
        mimeType: 'application/zip',
        buffer: centerlineArchive,
      },
      {
        name: 'Synthetic-Tributary.zip',
        mimeType: 'application/zip',
        buffer: centerlineArchive,
      },
    ])
  await expect(page.getByText('Synthetic-Centerline', { exact: true }).first())
    .toBeVisible()
  await page.getByText('Show shapefile overlays', { exact: true }).click()

  await page.getByRole('tab', { name: 'Stationing', exact: true }).click()
  const stationingSources = page.getByRole('group', {
    name: 'Centerlines on figure',
  })
  const centerlines = await stationingSources.getByRole('checkbox').all()
  expect(centerlines).toHaveLength(2)
  for (const centerline of centerlines) await centerline.check()
  await expect(page.getByLabel('Edit stationing for')).toBeEnabled()
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
  await continueWithoutProject(page)
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
  await continueWithoutProject(page)
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
