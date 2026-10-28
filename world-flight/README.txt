CITY FLIGHT — GRAND TOURS

Open index.html through the arcade web server. The selector offers 16 new city tours and the existing Berlin City Flight.

All 16 new cities have 25 named sightseeing checkpoints, matching Berlin. Routes connect nearby landmarks, museums, parks, squares and waterfront sights. Added stops retain their mapped architecture and have gold markers and inspection views; only selected monuments get custom models.

Each city is loaded separately: cities.json supplies the curated route and links to Google Maps; data/<city>.bin is gzip-compressed JSON of actual OpenStreetMap footprints, streets, parks and water. No paid API, credentials or third-party runtime requests are needed. Google Maps opens only when its link is selected. The 16 new cities use a shared Three.js engine and start in the air near their first landmark.

Graphics: merged spatial map chunks, instanced scenery, capped pixel count (Balanced 1920x1080, Performance 1280x720, High 2560x1440), reduced reflection/shadow refresh, and full texture/shader/geometry warm-up before controls become active. Only one city lives in GPU memory. Pause > Graphics changes quality. Each city has its own local progress key, world-flight.<city>.v1; Berlin retains its existing keys.

Map and landmark limitations: geography is mapped, but terrain is flat. Untagged building heights are estimated; facades and landmark silhouettes are stylized procedural models rather than photogrammetry. Catalog model dimensions are approximate. Landmarks are deliberately enlarged for readability (bridge spans stay aligned to the mapped banks), with lower nearby background buildings and gold markers. Rome and Venice have distinct facades, pitched roofs and local details. Route clusters exclude distant attractions and airports. Ring positions are offset from landmarks and raised above nearby collision volumes.

DATA SOURCES (retrieved 2026-10-24)
OpenStreetMap contributors, Open Database License 1.0:
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/
BBBike extracts: https://download.bbbike.org/osm/bbbike/
Geofabrik: https://download.geofabrik.de/europe.html
OSM processed land polygons: https://osmdata.openstreetmap.de/data/land-polygons.html
Google Maps was consulted for city layouts and landmark locations; reference links are included in cities.json. No Google map imagery or 3D assets are distributed.

REBUILD
The .tools/build-flight-city.py importer requires Python osmium and shapely. Clip the city source PBF to cities.json bounds with osmium extract (smart strategy, multipolygon relations), then run:
  python .tools/build-flight-city.py CITY-clip.osm.pbf CITY-map.json CITY-config.json
.tools/package-flight-maps.py merges the official OSM land/coastline polygons with the mapped water and writes compressed files. It requires pyshp and shapely, the generated city-map.json files and land-polygons-split-4326/land_polygons.shp. See its command-line help.

CHECKS
.tools/test-world-flight.mjs uses the local CDP harness and server on port 8777 to check all 16 loads, all route hoops, separate saves, warmed geometry/program counts, and 1080p frame timing. It requires Chromium with access to a hardware rendering device for meaningful GPU measurements. Software-rendered results do not measure the computer's GPU performance.

LANDMARK LOOK
Press Y on the controller, L on the keyboard, or the on-screen landmark button to pause flight and inspect the nearby/target landmark. A or B returns to the unchanged flight; Fly from here begins a scenic flight nearby. Explore places also opens landmark close-ups. The Colosseum and Rialto use dedicated architecture models; Venice also has custom St Mark’s Basilica, campanile and Doge’s Palace.
Architecture references: https://colosseo.it/en/area/the-colosseum/ and https://www.veneziaunica.it/en/things-to-do-in-venice/monuments-and-theatres/rialto-bridge

EXPANDED TOURS
Route version 5 keeps pilot names, settings and saved plane positions. Previous route scores and resume data are archived in each profile under previousTours; the expanded route starts at checkpoint 1. Subsequent saves continue normally. .tools/test-expanded-tours.mjs checks migration, catalog limits and consecutive checkpoint spacing.

SPACED TOURS (route version 6; Berlin City Flight version 5)
Nearby sights are interleaved with stops in other areas. Consecutive landmark centers are at least 750 metres apart; the 16 new cities retain the same 25 sights and no leg exceeds 2.15 km. The enhanced Berlin tour keeps its takeoff/landing stops and original sights. .tools/space-flight-routes.py uses a deterministic offline route optimizer; it adds no work during flight. Actual hoop spacing and collision-safe collection are checked in the browser. Existing 25-stop best scores and plane positions are retained; old resume data is archived and the reordered tour begins at stop 1.

BENGALURU / BANGALORE (2026-10-26)
Central Bengaluru adds 25 stops, spaced at least 750 metres apart by landmark center. Geofabrik Southern Zone supplies the real OSM buildings, roads, parks and lakes. The inland map requires no coastline geometry; overlapping lake polygons are merged. Vidhana Soudha, the High Court and State Central Library, Bangalore Palace, Tipu’s summer palace, Lalbagh Glasshouse and Chinnaswamy stadium use stylized dedicated models. Google Maps place searches were reviewed for all 25 stops; architecture references: https://bengaluruurban.nic.in/en/tourism/ and https://karnatakatourism.org/en/destinations/bengaluru/ .
