// =====================================================================
//  North American LiDAR Catalog  —  prioritized by quality & detail
// ---------------------------------------------------------------------
//  Compiled from public elevation programs (as of mid-2026):
//    * USGS 3DEP (United States + territories)         usgs.gov/3dep
//    * NRCan CanElevation / HRDEM (Canada)             geo.ca
//    * INEGI Continuo de Elevaciones (Mexico)          inegi.org.mx
//    * NOAA Digital Coast (coastal zones)              coast.noaa.gov
//    * ArcticDEM / provincial & national open portals
//
//  QUALITY LEVELS (USGS 3DEP Lidar Base Specification)
//    QL0  : >= 8  pts/m^2 , 5 cm  RMSEz   (ultra-high detail)
//    QL1  : >= 8  pts/m^2 , 10 cm RMSEz
//    QL2  : >= 2  pts/m^2 , 10 cm RMSEz   (national 3DEP standard)
//    QL3  : >= 0.5 pts/m^2 , 20 cm RMSEz  (legacy)
//    IfSAR: ~5 m  (radar, Alaska/Arctic — NOT true lidar)
//
//  Fields per region:
//    q      dominant/best quality tier available
//    dens   nominal pulse density (pts/m^2) typical of that tier
//    cov    % of land area with lidar meeting QL2 or better
//    score  0-100 composite "detail index" (coverage x quality weight)
//    prog   primary program(s) / portal(s)
//    yr     most recent significant collection or refresh
//    gap    what is missing / caveats
//    portal download / viewer URL
// =====================================================================

// quality weighting used for the composite score & color ramp
window.LIDAR_QL_WEIGHT = { QL0: 1.0, QL1: 0.96, QL2: 0.85, QL3: 0.55, IfSAR: 0.30, none: 0.0 };
window.LIDAR_QL_COLOR = {
  QL0:  '#3fe0a0',   // emerald  — ultra high detail
  QL1:  '#7fe05a',   // green
  QL2:  '#cfe23c',   // lime     — national standard
  QL3:  '#f2b134',   // amber    — legacy / coarse
  IfSAR:'#e8663c',   // orange   — radar, not lidar
  none: '#7a2b2b'    // dark red — no lidar
};

function _score(cov, q) { return Math.round(cov * (window.LIDAR_QL_WEIGHT[q] || 0)); }

// helper to keep the table below terse
function R(cov, q, dens, prog, yr, gap, portal) {
  return { cov, q, dens, score: _score(cov, q), prog, yr, gap, portal };
}

var P_3DEP = 'USGS 3DEP';
var U_3DEP = 'https://apps.nationalmap.gov/lidar-explorer/';

window.LIDAR_REGIONS = {
  // ============================ UNITED STATES ============================
  'US-AL': R(100,'QL2',2, P_3DEP, 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-AK': R(18,'IfSAR',0.1,'USGS 3DEP (IfSAR) + coastal lidar', 2023,
             'BIGGEST U.S. GAP: interior mapped only by 5 m IfSAR radar, not true lidar. True QL2 lidar limited to a few boroughs, coastal & road corridors.', U_3DEP),
  'US-AZ': R(97,'QL2',2, P_3DEP, 2021, 'Near-complete QL2; scattered QL1 around Phoenix/Tucson.', U_3DEP),
  'US-AR': R(100,'QL2',2, P_3DEP, 2020, 'Statewide QL2 complete.', U_3DEP),
  'US-CA': R(96,'QL2',2, 'USGS 3DEP + CA statewide', 2023,
             'QL1 along the coast & faults (USGS earthquake program). Remaining voids in remote desert/Sierra high country now largely filled.', U_3DEP),
  'US-CO': R(98,'QL2',2, P_3DEP, 2022, 'Near-complete QL2; high-alpine snow zones last to fill.', U_3DEP),
  'US-CT': R(100,'QL1',8, 'CT statewide (2023) + 3DEP', 2023, 'Full statewide QL1 — among the best in the nation.', U_3DEP),
  'US-DE': R(100,'QL1',8, 'DE statewide + 3DEP', 2022, 'Statewide QL1/QL2 complete.', U_3DEP),
  'US-DC': R(100,'QL1',8, 'DC OCTO + 3DEP', 2022, 'Dense urban QL1 with frequent refresh.', U_3DEP),
  'US-FL': R(100,'QL2',2, 'FL DEM + NOAA + 3DEP', 2022, 'Statewide QL2; QL1 along hurricane-prone coasts.', U_3DEP),
  'US-GA': R(100,'QL2',2, P_3DEP, 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-HI': R(88,'QL2',2, 'USGS 3DEP + NOAA', 2021,
             'Main islands QL2; gaps on rugged/inaccessible terrain (interior Hawaiʻi, NW islands).', U_3DEP),
  'US-ID': R(95,'QL2',2, P_3DEP, 2022, 'Near-complete; central wilderness last to fill.', U_3DEP),
  'US-IL': R(100,'QL2',2, 'IL Height Mod + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-IN': R(100,'QL2',2, 'IndianaMap + 3DEP', 2020, 'Early statewide adopter; refreshed QL2.', U_3DEP),
  'US-IA': R(100,'QL2',2, 'IA GeoData + 3DEP', 2021, 'One of the first statewide lidar states (2010).', U_3DEP),
  'US-KS': R(98,'QL2',2, 'DASC + 3DEP', 2022, 'Near-complete QL2.', U_3DEP),
  'US-KY': R(100,'QL2',2, 'KyFromAbove + 3DEP', 2022, 'Statewide QL2; growing QL1 (Phase 3).', 'https://kyfromabove.ky.gov/'),
  'US-LA': R(100,'QL2',2, 'Atlas / LSU + 3DEP', 2021, 'Early adopter (Atlas, 2000s); refreshed QL2.', U_3DEP),
  'US-ME': R(100,'QL2',2, 'MaineDEP + 3DEP', 2022, 'Statewide QL2 complete.', U_3DEP),
  'US-MD': R(100,'QL1',8, 'MD iMap + 3DEP', 2022, 'Statewide QL1 — very high detail.', U_3DEP),
  'US-MA': R(100,'QL2',2, 'MassGIS + 3DEP', 2021, 'Statewide QL2; QL1 in the east.', U_3DEP),
  'US-MI': R(100,'QL2',2, 'MI statewide + 3DEP', 2021, 'Statewide QL2 completed ~2021.', U_3DEP),
  'US-MN': R(100,'QL2',2, 'MnTOPO + 3DEP', 2023, 'Pioneer statewide (2011); QL1 refresh underway.', 'https://www.mngeo.state.mn.us/chouse/elevation/lidar.html'),
  'US-MS': R(100,'QL2',2, P_3DEP, 2020, 'Statewide QL2 complete.', U_3DEP),
  'US-MO': R(100,'QL2',2, 'MSDIS + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-MT': R(95,'QL2',2, P_3DEP, 2022, 'Near-complete; remote eastern plains/badlands last.', U_3DEP),
  'US-NE': R(100,'QL2',2, 'NE DNR + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-NV': R(94,'QL2',2, P_3DEP, 2022, 'Near-complete; some Great Basin voids remain.', U_3DEP),
  'US-NH': R(100,'QL2',2, 'NH GRANIT + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-NJ': R(100,'QL1',8, 'NJGIN + 3DEP', 2022, 'Statewide QL1 — very high detail.', U_3DEP),
  'US-NM': R(96,'QL2',2, P_3DEP, 2022, 'Near-complete QL2.', U_3DEP),
  'US-NY': R(100,'QL2',2, 'NYS GPO + 3DEP', 2022, 'Statewide QL2; QL1 for NYC & Long Island.', U_3DEP),
  'US-NC': R(100,'QL2',2, 'NC QL2 / Floodplain + 3DEP', 2022,
             'The original statewide lidar pioneer (2001, post-Floyd). Fully refreshed to QL2 2014-2017.', 'https://www.nconemap.gov/pages/elevation'),
  'US-ND': R(100,'QL2',2, P_3DEP, 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-OH': R(100,'QL2',2, 'OSIP + 3DEP', 2021, 'OSIP-2 statewide QL2 refresh complete.', U_3DEP),
  'US-OK': R(99,'QL2',2, P_3DEP, 2021, 'Near-complete statewide QL2.', U_3DEP),
  'US-OR': R(93,'QL2',2, 'DOGAMI + 3DEP', 2022, 'Extensive coverage; remaining SE high-desert voids filling.', 'https://www.oregongeology.org/lidar/'),
  'US-PA': R(100,'QL1',8, 'PAMAP + 3DEP', 2024,
             'PAMAP pioneer (2006). Statewide QL1 refresh 2021-2024 — one of the highest-detail states.', U_3DEP),
  'US-RI': R(100,'QL2',2, 'RIGIS + 3DEP', 2022, 'Statewide QL2 complete.', U_3DEP),
  'US-SC': R(100,'QL2',2, P_3DEP, 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-SD': R(100,'QL2',2, P_3DEP, 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-TN': R(100,'QL2',2, 'TN statewide + 3DEP', 2021, 'Statewide QL2 (2-ft) complete.', U_3DEP),
  'US-TX': R(96,'QL2',2, 'TNRIS StratMap + 3DEP', 2023,
             'Huge state — StratMap near-complete QL2; a few far-west/Big Bend blocks remain.', 'https://data.geographic.texas.gov/'),
  'US-UT': R(97,'QL2',2, 'UGRC + 3DEP', 2022, 'Near-complete QL2; QL1 along the Wasatch Front faults.', U_3DEP),
  'US-VT': R(100,'QL2',2, 'VCGI + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-VA': R(100,'QL2',2, 'VGIN + 3DEP', 2022, 'Statewide QL2 complete.', U_3DEP),
  'US-WA': R(95,'QL2',2, 'WA DNR Lidar Portal + 3DEP', 2023,
             'DNR portal very rich; QL1 over Cascadia faults & volcanoes. Remaining voids in NE/olympic interior.', 'https://lidarportal.dnr.wa.gov/'),
  'US-WV': R(100,'QL2',2, 'WV GIS Tech Ctr + 3DEP', 2020, 'Statewide QL2 complete (2020).', U_3DEP),
  'US-WI': R(100,'QL2',2, 'WI statewide + 3DEP', 2021, 'Statewide QL2 complete.', U_3DEP),
  'US-WY': R(93,'QL2',2, P_3DEP, 2022, 'Near-complete; remote basins/ranges last to fill.', U_3DEP),
  // US territory (admin-0 in dataset)
  'PR':    R(100,'QL2',2, 'USGS 3DEP', 2018, 'Full-island QL2 flown after Hurricane Maria (2018).', U_3DEP),

  // ================================ CANADA ==============================
  // NRCan HRDEM/CanElevation aggregates provincial open-lidar programs.
  'CA-ON': R(72,'QL2',2, 'Ontario Lidar + HRDEM', 2024,
             'Strong southern coverage (all of S. Ontario, GTA QL1). Far north (Hudson Bay lowlands, boreal) still ArcticDEM only.', 'https://geohub.lio.gov.on.ca/'),
  'CA-QC': R(76,'QL2',2, 'LiDAR Quebec (MFFP) + HRDEM', 2024,
             'Very extensive forestry lidar across the settled south & commercial forest. Far north tundra remains satellite-derived.', 'https://www.donneesquebec.ca/'),
  'CA-BC': R(58,'QL2',2, 'LidarBC + HRDEM', 2024,
             'Growing fast along populated valleys & coast. Vast mountainous/northern interior still incomplete.', 'https://lidar.gov.bc.ca/'),
  'CA-AB': R(66,'QL2',2, 'Alberta LiDAR + HRDEM', 2024, 'Good agricultural south & foothills; northern boreal partial.', 'https://open.alberta.ca/'),
  'CA-SK': R(48,'QL2',2, 'HRDEM + provincial', 2024, 'Populated south & river basins; large agricultural/boreal gaps.', 'https://geo.ca/'),
  'CA-MB': R(46,'QL2',2, 'HRDEM + provincial', 2024, 'Red River valley & south covered; central/north sparse.', 'https://geo.ca/'),
  'CA-NB': R(100,'QL2',2, 'NB provincial + HRDEM', 2018, 'Full-province QL2 — an early complete-coverage province.', 'https://geonb.snb.ca/'),
  'CA-NS': R(98,'QL2',2, 'Nova Scotia + HRDEM', 2023, 'Essentially province-wide QL2.', 'https://nsgi.novascotia.ca/'),
  'CA-PE': R(100,'QL2',2, 'PEI + HRDEM', 2018, 'Full-province QL2 complete.', 'https://geo.ca/'),
  'CA-NL': R(40,'QL2',2, 'HRDEM + provincial', 2024, 'Coastal communities & Avalon covered; interior Labrador/Nfld largely satellite-derived.', 'https://geo.ca/'),
  'CA-YT': R(16,'IfSAR',0.1,'ArcticDEM / IfSAR + corridor lidar', 2023, 'Mostly ArcticDEM/IfSAR. True lidar limited to Whitehorse & road/mining corridors.', 'https://geo.ca/'),
  'CA-NT': R(11,'IfSAR',0.1,'ArcticDEM / IfSAR', 2023, 'Almost no airborne lidar; ArcticDEM 2 m photogrammetry only.', 'https://geo.ca/'),
  'CA-NU': R(6,'IfSAR',0.1,'ArcticDEM', 2023, 'ARCTIC GAP: no meaningful airborne lidar; ArcticDEM only.', 'https://geo.ca/'),

  // ================================ MEXICO ==============================
  'MX': R(55,'QL3',1, 'INEGI Continuo de Elevaciones (CEM/LiDAR)', 2022,
          'INEGI flew large-area 5-pt & 1-pt lidar (roughly QL2/QL3) covering ~half the country, concentrated on populated & agricultural zones. Sierra Madre & desert interiors, and much of the south (Chiapas/Oaxaca highlands), remain unmapped by lidar.', 'https://www.inegi.org.mx/temas/relieve/continental/'),

  // ============================== GREENLAND =============================
  'GL': R(3,'none',0, 'ArcticDEM (photogrammetric)', 2023,
          'No airborne lidar coverage. Elevation is ArcticDEM 2 m stereo-photogrammetry only — not lidar. Effectively a total lidar gap.', 'https://www.pgc.umn.edu/data/arcticdem/'),

  // ======================= CENTRAL AMERICA & CARIBBEAN ==================
  'BZ': R(35,'QL2',2, 'REDD+/NASA G-LiHT + coastal', 2019, 'Project-based forestry & coastal lidar (carbon/REDD+). No national program; interior gaps.', 'https://gliht.gsfc.nasa.gov/'),
  'GT': R(18,'QL2',2, 'PACUNAM LiDAR (Maya) + project', 2019, 'Famous Maya Biosphere QL1/QL2 archaeology surveys, but tiny national footprint.', ''),
  'HN': R(12,'QL2',2, 'Mosquitia archaeology + project', 2018, 'Isolated project lidar (e.g. Mosquitia). No national coverage.', ''),
  'SV': R(15,'QL2',2, 'MARN / project', 2017, 'Small project-based coverage; largely unmapped by lidar.', ''),
  'NI': R(8,'QL2',2, 'Project-based', 2016, 'Very sparse; a few basin/hazard studies.', ''),
  'CR': R(38,'QL2',2, 'MOCUPP / national forestry lidar', 2019, 'Comparatively strong for the region — national forest-monitoring lidar over much of the country.', ''),
  'PA': R(22,'QL2',2, 'Canal watershed + STRI', 2018, 'Canal watershed & research (Barro Colorado) lidar; rest sparse.', ''),
  'CU': R(6,'QL3',1, 'Coastal / project', 2015, 'Minimal; a little coastal work. Largely unmapped.', ''),
  'HT': R(10,'QL2',2, 'Post-quake / NGO', 2016, 'Port-au-Prince & hazard-driven project lidar; otherwise none.', ''),
  'DO': R(14,'QL2',2, 'Coastal / project', 2017, 'Scattered coastal & watershed lidar.', ''),
  'JM': R(20,'QL2',2, 'Coastal / NOAA-style', 2017, 'Coastal-hazard lidar around Kingston & the coast.', ''),
  'BS': R(30,'QL2',2, 'NOAA-style coastal', 2018, 'Low-lying islands mapped for flood risk; interior banks n/a.', ''),
  'TT': R(15,'QL2',2, 'Project-based', 2016, 'Limited coastal/urban project lidar.', ''),
  'BM': R(60,'QL2',2, 'Gov + coastal', 2017, 'Small island with fairly complete coastal-flood lidar.', '')
};

// ------- programs / sources reference (shown in the Sources panel) -------
window.LIDAR_SOURCES = [
  { name: 'USGS 3DEP', region: 'United States + territories',
    note: '~99% of the U.S. has QL2+ lidar available or in progress (FY2025). National standard is QL2 (>=2 pts/m^2). Alaska is IfSAR, not lidar.',
    url: 'https://www.usgs.gov/3d-elevation-program' },
  { name: 'The National Map / Lidar Explorer', region: 'United States',
    note: 'Primary discovery & download portal for 3DEP point clouds and DEMs.',
    url: 'https://apps.nationalmap.gov/lidar-explorer/' },
  { name: 'OpenTopography', region: 'US + global',
    note: 'Hosts raw point clouds and on-demand DEM/derivative generation for research.',
    url: 'https://opentopography.org/' },
  { name: 'NRCan CanElevation / HRDEM', region: 'Canada',
    note: '~2.0M km^2 of airborne lidar (Sept 2025), covering 95%+ of the population and 244 of the 250 largest cities. North is ArcticDEM.',
    url: 'https://geo.ca/imagery/high-resolution-digital-elevation-model-hrdem-canelevation-series/' },
  { name: 'INEGI (Mexico)', region: 'Mexico',
    note: 'Continuo de Elevaciones Mexicano and airborne lidar blocks (~QL2/QL3) over roughly half the country.',
    url: 'https://www.inegi.org.mx/temas/relieve/continental/' },
  { name: 'NOAA Digital Coast', region: 'US + Caribbean coasts',
    note: 'Authoritative coastal-zone lidar (topobathymetric) for flood & shoreline work.',
    url: 'https://coast.noaa.gov/dataviewer/' },
  { name: 'Polar Geospatial Center — ArcticDEM', region: 'Arctic (not lidar)',
    note: '2 m stereo-photogrammetric elevation filling the lidar void across Alaska, N. Canada and Greenland.',
    url: 'https://www.pgc.umn.edu/data/arcticdem/' }
];

// ------------------------- biggest remaining gaps ------------------------
window.LIDAR_GAPS = [
  'Alaska interior — mapped only by 5 m IfSAR radar; true QL2 lidar under ~20% of the state.',
  'Canadian Arctic (Nunavut, NWT, Yukon) — essentially no airborne lidar; ArcticDEM only.',
  'Greenland — no airborne lidar anywhere; photogrammetric ArcticDEM only.',
  'Northern Canada boreal/tundra (N. Ontario, N. Quebec, interior BC & Labrador) — large voids.',
  'Mexico interior — Sierra Madre ranges and the southern highlands largely unflown.',
  'Central America & Caribbean — no national lidar programs; coverage is project-based (archaeology, REDD+, coastal hazard) except Costa Rica.',
  'US high-alpine & remote desert — the last few percent of CONUS (Sierra crest, Great Basin, Big Bend) still filling in.'
];
