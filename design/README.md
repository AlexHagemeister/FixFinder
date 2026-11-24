# Design

Design material for FixFinder: clickable prototypes, mockups, flow sketches, and screenshots. Nothing here is part of the app.

## Prototypes

`prototypes/` holds tap-through HTML prototypes with no build step. Serve the core app prototype over HTTP so OpenStreetMap receives a browser referrer for its map tiles.

To try one:

1. From the repo root, run `bun run dev` and open `http://localhost:5173/design/prototypes/core-app.html`. With Python instead, run `py -m http.server 8765 --bind 127.0.0.1` on Windows and open `http://127.0.0.1:8765/design/prototypes/core-app.html`.
2. Turn on the browser's device mode at a phone size, such as 375 × 812. In Chrome, that's View → Developer → Developer Tools, then the phone-and-tablet icon.
3. Tap through it as you would on a phone.

Text in [square brackets] is a placeholder that hasn't been checked against a real source. Cards marked "Possible future feature · sample" preview ideas from the possibility space in [VISION.md](../VISION.md), with made-up data.

To try the location map, use the sample photo, then choose **Change** on the Location row. The map needs internet access to load Leaflet and OpenStreetMap tiles. The prototype starts from a sample Berkeley location and shows a generic label after you move the pin. Naming the new location requires reverse geocoding.

| File | What it shows |
|---|---|
| [prototypes/core-app.html](prototypes/core-app.html) | The core app: Home, My reports, and Settings tabs, and the report flow from photo to Report sent |
