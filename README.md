# Hydraulic Figure Generator

A React workspace for producing report-ready hydraulic figures from SRH-2D and
SMS H5 exports. Files are processed locally in the browser and are never
uploaded.

The first figure module is the FRA WSE Difference map:

- Detects Existing and Proposed geometry and datasets H5 files by contents.
- Pairs selectable hydraulic runs.
- Calculates Proposed minus Existing WSE where both conditions have results.
- Classifies WSE differences to match the legend and outlines each class boundary.
- Classifies newly inundated and newly dry areas using a configurable dry-depth
  threshold.
- Reads zipped shapefile overlays.
- Exposes report-frame, legend, color, title, map-view, and figure-element
  controls.
- Exports a report-resolution PNG.

## Architecture

```text
src/
  components/          Reusable workspace controls
  core/
    hydraulicEngine.ts SMS H5 parsing, run metadata, mesh matching, WSE logic
    mapRenderer.ts     Canvas map composition and report elements
    shapefile.ts       Zipped shapefile ingestion
    types.ts           Hydraulic and figure contracts
  App.tsx              FRA WSE Difference workspace
```

The `core` modules are intentionally independent of the React interface so
future FRA, Appendix H, and Appendix K figure modules can share the same data
and rendering contracts.

## Development

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

The optional Site 6 integration test reads data from a local directory and
writes a rendered PNG to the temporary directory:

```powershell
$env:HFG_SITE6_DATA = "C:\path\to\Data h5 and shapefiles"
npm run test:site6
```

GitHub Pages deploys automatically from `main`.
