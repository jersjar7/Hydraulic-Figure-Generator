# Testing

## Required Gates

Run before merging or deploying:

```bash
npm run lint
npm test
npm run build
```

GitHub Pages runs these commands in this order and deploys only after all three
pass.

## Checked-In Regression Tests

Tests under `tests/` use the Node.js test runner and require no project data.
They cover:

- Exact nearest-node matching across spatial-index cell boundaries.
- Mesh-spacing tolerance behavior.
- Current project-file round trips.
- Supported legacy project migration.
- Rejection of future, wrong-figure, malformed, and unsafe project files.
- Assessment-line contour stitching, directed centerline stationing, ambiguous
  crossings, explicit exclusions, and station formatting.
- Assessment WSE callout hit testing, global visibility, and positioned labels.
- Persistence validation for centerline, per-line review decisions, and callout
  visibility and placement.
- Known and arbitrary scenario-name detection plus version 11 role migration.

Add a focused test for every bug fixed in a core module. Prefer small synthetic
geometry where the expected engineering result can be calculated by hand.

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

## Next Coverage

Before adding another figure type, add checked-in synthetic coverage for:

- Missing and malformed H5 groups.
- Dataset/geometry node-count mismatches.
- Nonoverlapping and differently spaced meshes.
- CRS failures and projected shapefile fixtures.
- Basemap failure and cache behavior.
- Additional save-file migrations after version 10.

Browser interaction tests should be added when a second figure workflow is
introduced, because navigation and shared-shell regressions then become more
likely.
