# Landing: service-area map

Issue: [#346](https://github.com/mmiri-oma/mmirioma/issues/346) · Requirements:
FR-010, FR-020, FR-027, NFR-020, NFR-021, NFR-022 · Prompt: none (an
amendment to the landing page's "Our service areas" section, see
[landing-v1.md](landing-v1.md)) · Contract (proposed, G3 not yet passed):
[admin-directory.md](../api/admin-directory.md#amendment-346-zone-centre-and-boundary-on-get-service-zones) ·
Map choice (decided, #334): [maps.md](../architecture/maps.md), option M1,
MapLibre GL JS with OpenFreeMap tiles
Designer: @Cloudcrackamara + Claude Code · Reviewed by: none yet · Status: draft

**Draft for a reviewer who is not the author.** Do not build the screen until
this says `Status: approved` (G2) and the contract says `Status: agreed` (G3).

## What changes

The landing page's section "Our service areas" shows a hard-coded list
(`SERVICE_AREAS` in `content.ts`) labelled "Sample list". It becomes a map of
the **real active service zones** from the API, with the same names as a list
beside or under it. Nothing else on the landing page changes: the "Not on the
list? Ask us" card, its WhatsApp or call link, the section's place and the
`#areas` anchor stay.

## Screens and states

One section, `#areas`, at 360 px and 1280 px.

| State | What the visitor sees |
| --- | --- |
| Loading | The heading, the intro line and a grey block where the map will be (same height, so the page does not jump), and three grey chips for the list |
| Zones, with map | The map fitted to all zones, then the list of names. Each zone with a boundary is drawn as an outlined, lightly filled area with its name; a zone without a boundary is a pin at its centre with its name. One zone: the map is centred on it |
| Zones, map unavailable | The list of names alone, and under the map's place one line: "The map could not be loaded. The areas we serve are listed here." Same when the map code fails to load or the tiles do not arrive. The list never depends on the map |
| No active zone | No map. The heading, and: "We have not opened a delivery area yet. Call or WhatsApp us and we will tell you when we start." with the existing call or WhatsApp link |
| Zones could not be loaded | "We could not load the areas. Call or WhatsApp us to check your area." with the same link, and "Try again" |
| Reduced motion | The map jumps to its view instead of flying to it (`prefers-reduced-motion`) |

**No-JS.** The whole landing page is drawn by JavaScript, so a visitor with
JavaScript off sees no page at all, not only no map. The "plain list of area
names" the issue asks for is therefore what the visitor gets when the map
cannot load (above). A list in the HTML for visitors without JavaScript would
need prerendering, which this project does not do; raised as an open
question.

## Layout

- **1280 px:** two columns as now: heading, intro, the list and the "Not on
  the list" card on the left; the map on the right, about 420 px high.
- **360 px:** one column: heading, intro, the map (about 280 px high), the
  list, the card.
- The list is the existing pill chips (`PinIcon` and the name), built from the
  API names, in the API order (by name).
- Intro text, replacing the "Sample list" sentence: "The areas we deliver to
  during the pilot. Not on the list? Ask us." No claim of coverage beyond the
  zones, no delivery time, no "we deliver everywhere in Enugu" (FR-027, prompt
  09 rules).

## Map behaviour

- **Lazy.** The map code and its CSS load only when the section is near the
  viewport (an intersection observer), so the landing page's first load does
  not include them. The PR notes the bundle change (issue's "Done when").
- **Gestures.** The page must still scroll on a phone: one finger scrolls the
  page, two fingers move the map; on desktop the wheel scrolls the page and a
  modifier key zooms ("cooperative gestures").
- **Controls.** Zoom in and out buttons at least 48 px (NFR-020); the library's
  default 29 px buttons are replaced. No search box, no "locate me": the
  visitor is not asked for their location here.
- **Attribution.** The library's attribution ("OpenFreeMap, OpenMapTiles,
  OpenStreetMap contributors") stays visible and is not removed or hidden.
- **Accessibility.** The map is a labelled region ("Map of our service areas")
  and is decoration for people using a screen reader or a keyboard: the list
  carries the same information. Colour is never the only carrier: outlined
  areas also carry their name. Contrast of labels meets the design system.
- **Style.** The tile style address is one configuration value (`VITE_*`,
  public by design), as [maps.md](../architecture/maps.md) section 3 says, so
  moving to another provider is a configuration change.
- **Privacy.** The tile requests go from the visitor's browser to the tile
  provider: their IP address and the parts of the map they view, not any
  typed address. The privacy notice must name the provider before this
  section goes live ([open question 3](#open-questions)).

## Screen-to-endpoint table

| Screen | Element / action | Endpoint | Fields used |
| --- | --- | --- | --- |
| Landing, `#areas` | Map and list | `GET /service-zones` (no session) | `items[].name`, and, once the contract is agreed, `items[].centre` and `items[].boundary` |
| Landing, `#areas` | "Try again" | same | same |

Tiles come from the configured tile provider, not from MmiriOma's API.

## Decisions to confirm

1. **Boundary when set, pin otherwise.** Zones always have a centre and may
   have a boundary (FR-010). The issue asks whether to add geometry or show
   one pin per area. Recommendation: use what the zone has, draw the boundary
   when present and a pin at the centre otherwise, so the map is right
   whichever the admin has entered and no new admin screen is needed (the
   admin Service areas screen already sets both).
2. **Geometry on the existing public endpoint.** Recommendation: add `centre`
   and an optional `boundary` to `GET /service-zones` (additive; see the
   contract amendment) rather than a second endpoint, so the list, the
   address form and the map read one source. The earlier contract said the
   list holds "no coordinates or boundary"; this reverses that on purpose, and
   a service area's outline is not personal data.
3. **Name only, no fees.** The public list still carries no fees (customers
   see the total only).

## Open questions

1. Is a list in the page HTML for visitors without JavaScript wanted? It
   needs prerendering, which the project does not have. Recommendation: no.
2. The issue says to "ask the team" whether a zone with no boundary shows a
   pin. This design assumes yes (decision 1).
3. Who edits the privacy notice (section 7) to name the tile provider, and
   when? [maps.md](../architecture/maps.md) section 8 gives that edit to
   #340, which adds the same provider for the address pin. If #346 ships
   first, its PR makes the edit instead.
4. The condition from #334: someone reads OpenFreeMap's privacy policy before
   go-live.

## Changes to the design system

None planned: the list reuses the existing area chips; the map's zoom buttons
are two icon buttons from the existing icon set at 48 px.
