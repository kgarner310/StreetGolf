# LiDARy — North America LiDAR Explorer

A self-contained, Google-Earth-style web app that maps **North American LiDAR /
elevation coverage, prioritized by quality and detail**, and calls out where
coverage is **missing**.

Open `lidar/index.html` in any modern browser. No build step, no server, no
external tiles or CDNs — the globe is rendered from scratch on a `<canvas>`, so
it works fully offline.

## What it shows

An orbitable 3D globe (plus a flat-map toggle) of North America where every
state, province, territory and country is colored by its LiDAR coverage. Click a
region for a detail card: coverage %, quality tier, point density, the program
that flew it, latest collection year, a data-portal link, and — importantly —
what's still missing.

Three coloring modes:

| Mode | Meaning |
|------|---------|
| **Detail index** | Composite 0–100 score (coverage × quality weight) — the default ranking |
| **Quality tier** | Colored by the best USGS quality level available (QL0 → IfSAR) |
| **Coverage** | Percent of area meeting the QL2 national standard |

Plus a **Highlight gaps only** mode that greys out well-covered areas and lights
up the holes.

## Quality levels (USGS 3DEP Lidar Base Specification)

| Tier | Point density | Vertical accuracy | Notes |
|------|--------------|-------------------|-------|
| QL0 | ≥ 8 pts/m² | 5 cm RMSEz | Ultra-high detail |
| QL1 | ≥ 8 pts/m² | 10 cm RMSEz | High detail |
| QL2 | ≥ 2 pts/m² | 10 cm RMSEz | **National 3DEP standard** |
| QL3 | ≥ 0.5 pts/m² | 20 cm RMSEz | Legacy / coarse |
| IfSAR | ~5 m | radar | Alaska/Arctic — **not true lidar** |

## The detail index

```
score = coverage% × qualityWeight(bestTier)
qualityWeight: QL0 1.00 · QL1 0.96 · QL2 0.85 · QL3 0.55 · IfSAR 0.30 · none 0
```

This rewards both **breadth** (how much of the area is flown) and **detail** (how
dense the best available data is), so a fully-covered QL1 state outranks a
fully-covered QL2 state, and a half-covered region ranks well below either.

## Biggest gaps (highlights)

- **Alaska interior** — mapped only by 5 m IfSAR radar; true QL2 lidar under ~20% of the state.
- **Canadian Arctic** (Nunavut, NWT, Yukon) — essentially no airborne lidar; ArcticDEM only.
- **Greenland** — no airborne lidar anywhere; photogrammetric ArcticDEM only.
- **Northern Canada boreal/tundra** (N. Ontario, N. Quebec, interior BC, Labrador) — large voids.
- **Mexico interior** — Sierra Madre ranges and southern highlands largely unflown.
- **Central America & Caribbean** — no national programs; coverage is project-based (archaeology, REDD+, coastal), except Costa Rica.
- **US high-alpine & remote desert** — the last few percent of CONUS still filling in.

## Data sources

Compiled from public elevation programs (status as of mid-2026):

- **USGS 3DEP** — US + territories. ~99% has QL2+ available or in progress (FY2025). <https://www.usgs.gov/3d-elevation-program>
- **NRCan CanElevation / HRDEM** — Canada. ~2.0M km² airborne lidar (Sept 2025), ~95% of population. <https://geo.ca>
- **INEGI** — Mexico. Airborne lidar over roughly half the country. <https://www.inegi.org.mx>
- **NOAA Digital Coast** — coastal topobathymetric lidar. <https://coast.noaa.gov>
- **Polar Geospatial Center — ArcticDEM** — fills the Arctic lidar void (photogrammetry, not lidar). <https://www.pgc.umn.edu/data/arcticdem/>

Boundaries: Natural Earth 1:50m admin-0 / admin-1 (public domain), simplified.

> Coverage and quality figures are approximate, region-level estimates intended
> for orientation and comparison — not survey-grade tile indices. Use the linked
> official portals for authoritative, up-to-date availability.

## Files

```
lidar/
  index.html            app shell
  css/style.css         styling
  js/geo.js             orthographic + flat projections, hit-testing
  js/app.js             renderer, interaction, panels, search
  data/regions.js       simplified North America boundaries (GeoJSON)
  data/lidar_data.js    the LiDAR coverage/quality catalog + sources
```
