# Hydraulic Figure Generator

A React workspace for producing report-ready hydraulic figures from SRH-2D and
SMS H5 exports. Files are processed locally in the browser and are never
uploaded.

The first figure module is the FRA WSE Difference map:

- Detects Natural, Existing, Proposed, and consistently named alternative
  geometry/datasets H5 pairs by contents and filenames.
- Assigns any loaded scenario to Baseline, Comparison, and assessment-source
  roles, with independently selectable runs.
- Calculates Comparison minus Baseline WSE where both scenarios have results.
- Classifies WSE differences to match the legend and outlines each class boundary.
- Generates reusable assessment-source WSE lines at whole-foot or half-foot
  elevation intervals, independently styled from difference boundaries.
- Filters and stations assessment lines against an imported hydraulic
  centerline, with explicit review for ambiguous crossings.
- Labels included assessment lines with their WSE, with global and per-line
  visibility plus draggable, leader-anchored positions.
- Classifies newly inundated and newly dry areas using a configurable dry-depth
  threshold.
- Reads zipped shapefile overlays.
- Exposes report-frame, legend, color, title, map-view, and figure-element
  controls.
- Exports a report-resolution PNG.

## Architecture

```text
src/
  components/          Reusable workspace controls and project workflow views
    project-data/      Models, Layers, Assess, and Review navigation
  core/
    hydraulicEngine.ts SMS H5 parsing, run metadata, mesh matching, WSE logic
    assessmentLines.ts Existing WSE contour generation and polyline stitching
    centerlineStationing.ts Centerline extraction, intersections, and stationing
    meshMatching.ts    Exact spatial matching and mesh-spacing tolerance
    mapRenderer.ts     Canvas map composition and report elements
    projectFile.ts     Versioned save-file validation and migrations
    shapefile.ts       Zipped shapefile ingestion
    types.ts           Hydraulic and figure contracts
  features/
    assessment-lines/  Stationing controls, bounded review state, and interface
  App.tsx              FRA WSE Difference workspace
```

The `core` modules are intentionally independent of the React interface so
future FRA, Appendix H, and Appendix K figure modules can share the same data
and rendering contracts. See [Architecture](docs/ARCHITECTURE.md),
[Hydraulic contract](docs/HYDRAULIC-CONTRACT.md), and
[Testing](docs/TESTING.md) before extending those contracts.

## Development

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

Run the checked-in regression suite, build, and lint:

```bash
npm test
npm run build
npm run lint
```

The optional Site 6 integration test reads data from a local directory and
writes a rendered PNG to the temporary directory:

```powershell
$env:HFG_SITE6_DATA = "C:\path\to\Data h5 and shapefiles"
npm run test:site6
```

An additional real-file acceptance test verifies Existing-to-Natural pairing:

```powershell
$env:HFG_NATURAL_DATA = "C:\path\to\Existing and Natural H5 files"
npm run test:natural
```

GitHub Pages deploys automatically from `main`.
The Pages workflow requires lint, regression tests, and the production build to
pass before deployment.
