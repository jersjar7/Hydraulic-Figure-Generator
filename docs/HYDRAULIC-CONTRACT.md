# Hydraulic Contract

This document records the assumptions behind the FRA WSE Difference figure.
Changes to these rules can change engineering results and require regression
tests plus review of the Site 6 acceptance output.

## SMS Geometry

A geometry H5 file must contain:

- `2DMeshModule/<mesh>/Nodes/NodeLocs`
- `2DMeshModule/<mesh>/Elements/Nodeids`
- `2DMeshModule/<mesh>/Coordinates` with a `WKT` attribute

Node coordinates are read as X, Y, Z triplets. Three-node elements become one
triangle; four-node elements are split into two triangles. The WKT is
transformed to WGS84 and Web Mercator for basemap composition.

## SMS Results

Runs are discovered beneath `Datasets/<run>`. A usable parameter contains a
`Values` dataset. The WSE Difference figure requires names matching:

- WSE: `Water_Elev`, `WaterElev`, or `WSE`
- Depth: `Water_Depth` or `WaterDepth`

The figure uses the final stored timestep. Values at or below `-900`, NaN, and
infinite values are treated as missing.

Every result parameter must report the same node count as its condition
geometry. A mismatched pair may remain visible so the user can replace one
file, but the condition is not considered ready and figure generation is
blocked.

## Difference Direction

The reported difference is:

```text
Proposed WSE - Existing WSE
```

Positive values are WSE rise. Negative values are WSE reduction.

## Mesh Matching

Existing and Proposed meshes may differ. Each Existing node is compared with
the exact nearest Proposed node found by the spatial index. A match is accepted
only when its distance is within a tolerance derived from the median edge
length of the target mesh:

```text
max(2.25 * median edge length, 0.75 * spatial-index cell size)
```

The reverse Proposed-to-Existing check uses the Existing mesh tolerance for
newly inundated classification. The current method is nearest-node matching,
not triangle interpolation. Any future switch to barycentric interpolation is a
hydraulic-method change and must update golden acceptance values.

## Wet And Dry

A node is wet only when:

```text
Water Depth > dry-depth threshold
```

The default threshold is `0.00 ft`, so any positive modeled depth is wet.
The threshold remains configurable for project-specific numerical noise.

Newly inundated means Proposed is wet where Existing is dry or has no
comparable result. Newly dry means Existing is wet and comparable Proposed is
dry.

## CRS And Units

Both model geometries must include readable WKT coordinate systems and refer to
the same physical project area. Shapefiles are transformed independently from
their `.prj` definition. Elevation and depth labels assume feet because the
required SMS datasets are the `_ft` exports.
