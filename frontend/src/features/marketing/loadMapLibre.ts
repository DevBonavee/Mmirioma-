/** The loaded map library: the one thing the service-area map needs from it. */
export type MapLibre = typeof import('maplibre-gl')

/**
 * Load the map library and its stylesheet. Called only when the service-area
 * map comes near the viewport, so neither is part of the landing page's first
 * load (#346).
 *
 * @throws If either chunk cannot be fetched; the map then shows its note.
 */
export async function loadMapLibre(): Promise<MapLibre> {
  const [library] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
  return library
}
