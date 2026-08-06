# Testing

## Required Gates

Run before merging or deploying:

```bash
npm run lint
npm run check:architecture
npm test
npm run build
npm run test:e2e
```

GitHub Pages runs these commands and deploys only after all five gates pass.

Extension registries also have a focused local gate:

```bash
npm run test:contracts
```

The shared contract kit validates figure modules, editor tools, settings
sections, project workflows, and render-layer registries before their
feature-specific tests run.

## Checked-In Regression Tests

Tests directly under `tests/` use the Node.js test runner and require no
project data. They cover:

- Exact nearest-node matching across spatial-index cell boundaries.
- Mesh-spacing tolerance behavior.
- Current project-file round trips.
- Folder-project manifest validation, ordered writes, separate SMS input files,
  explicit dirty state, and Hydraulic Profiles & Sections restoration.
- Supported legacy project migration.
- Rejection of future, wrong-figure, malformed, and unsafe project files.
- Assessment-line contour stitching, directed centerline stationing, ambiguous
  crossings, explicit exclusions, and station formatting.
- Assessment WSE callout hit testing, global visibility, and positioned labels.
- Persistence validation for centerline, per-line review decisions, and callout
  visibility and placement.
- Known and arbitrary scenario-name detection plus version 11 role migration.
- WSE figure registration, accepted engineering defaults, class boundaries,
  and synthetic landscape/portrait raster output.
- Editor-tool, settings-section, and ordered render-layer registry contracts.
- Reusable annotation capability and collection behavior.
- Public-safe synthetic SMS H5 ingestion with hand-calculated WSE differences.
- Version 14 shared/figure project separation and version 13 migration.
- Application file filtering, project download/read ports, and WSE project
  hydration.
- Persisted WSE document and transient editor reducers.
- Modular map-tool ownership and WSE extrema callout reconciliation.
- Architecture dependency direction, React isolation, and the source-file
  composition ceiling.
- Appendix H-compatible hydraulic-profile grouping and station-order pairing,
  including the Site 2 regression where Dataset 2 is ground and all 11 sections
  must retain three WSE surfaces.

Add a focused test for every bug fixed in a core module. Prefer small synthetic
geometry where the expected engineering result can be calculated by hand.

Component tests under `tests/ui/` use Vitest, jsdom, and Testing Library. They
cover keyboard/pointer navigation and persistent diagnostics behavior.

Browser tests under `tests/e2e/` use Playwright Chromium. They verify the shared
desktop workflow, settings navigation, mobile access to both sidebars, and a
four-file synthetic SMS upload through nonblank canvas rendering.
GitHub Actions installs its own Chromium build; local Windows runs use installed
Google Chrome.

## Site 6 Acceptance Test

The local Site 6 test exercises real SMS files, shapefile ingestion, hydraulic
comparison, callouts, both report orientations, and raster rendering:

```powershell
$env:HFG_SITE6_DATA = "C:\SMS\Report Figures\Site 6\Data"
npm run test:site6
```

It pins the accepted node counts, WSE extrema, centerline length, station range,
and included/review/excluded assessment-line counts. It also verifies WSE
callouts with a raster-pixel comparison. Those golden values should change only
after an intentional hydraulic-method update and visual review of both
generated PNGs.

The Site 6 files are not committed and the acceptance test is therefore not a
GitHub Actions gate.

## Natural Scenario Acceptance

The Natural acceptance test loads real Existing and Natural geometry/datasets
pairs, verifies the scenario catalog and role readiness, pairs a shared event,
and requires a nonempty WSE-difference result:

```powershell
$env:HFG_NATURAL_DATA = "C:\SMS\Report Figures\Site 6\Data"
npm run test:natural
```

## Remaining Coverage Opportunities

The public-safe H5 fixtures live under `tests/fixtures/h5/` and can be
regenerated with `npm run fixtures:h5`. Before adding another figure type,
continue expanding checked-in synthetic coverage for:

- Missing and malformed H5 groups.
- Dataset/geometry node-count mismatches.
- Nonoverlapping and differently spaced meshes.
- CRS failures and projected shapefile fixtures.
- Basemap failure and cache behavior.
- PNG export completion from the synthetic browser fixture.
- Figure-specific browser tests as each new output module is introduced.
