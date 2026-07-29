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
Comparison WSE - Baseline WSE
```

Positive values are WSE rise. Negative values are WSE reduction.

## Mesh Matching

Baseline and Comparison meshes may differ. Each Baseline node is compared with
the exact nearest Comparison node found by the spatial index. A match is accepted
only when its distance is within a tolerance derived from the median edge
length of the target mesh:

```text
max(2.25 * median edge length, 0.75 * spatial-index cell size)
```

The reverse Comparison-to-Baseline check uses the Baseline mesh tolerance for
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

Newly inundated means Comparison is wet where Baseline is dry or has no
comparable result. Newly dry means Baseline is wet and comparable Comparison is
dry.

## Assessment-Source WSE Lines

Assessment lines are generated from the final-timestep WSE surface of the
scenario assigned to the Assessment source role.
Only triangles whose three nodes have valid WSE and depth greater than
the dry-depth threshold are contoured. The user may generate lines at 1.0-foot
or 0.5-foot elevation intervals.

Triangle contour segments are stitched into reusable map-coordinate polylines.
Each line retains parallel Web Mercator coordinates for drawing and original
model coordinates for engineering measurements. Length and station values
assume the SMS model horizontal units are feet.

An imported line shapefile may be selected as the hydraulic centerline. Its
WGS84 GeoJSON coordinates are transformed back into the assessment-source model CRS
before intersection and station calculations. Endpoint A is the first imported
vertex and endpoint B is the last. The user explicitly chooses which endpoint
is downstream; stationing increases upstream from that endpoint and from the
configured starting station.

One centerline intersection is included automatically. No intersection is
excluded. Multiple intersections or a collinear overlap require review. A user
may select one of multiple intersections or explicitly exclude a line.
Only included lines appear in exported figures. Their optional map callouts
show the assessment-line WSE, not the centerline station. Each leader remains
anchored to the selected centerline intersection while its label may be moved,
hidden, or reset independently. Global visibility and label style controls
apply to all assessment callouts. Review highlighting, endpoint badges, and
numbered intersection markers are editor aids and are not exported.

These objects are independent from the optional WSE-difference class outlines
and are the hydraulic basis for future observation-line charts and summary
tables.

## CRS And Units

All role-assigned model geometries must include readable WKT coordinate systems and refer to
the same physical project area. Shapefiles are transformed independently from
their `.prj` definition. Elevation and depth labels assume feet because the
required SMS datasets are the `_ft` exports.
