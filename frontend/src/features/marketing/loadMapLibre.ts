/** The loaded map library: the one thing the maps need from it. */
export type MapLibre = typeof import('maplibre-gl')

/**
 * Where the map tiles come from (docs/architecture/maps.md, option M1:
 * OpenFreeMap). One configuration value, public by design, so moving to
 * another provider is a configuration change and not a code change. Shared by
 * the landing page's service-area map (#346) and the address pin map (#345).
 */
export const MAP_STYLE_URL: string = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

/**
 * Load the map library and its stylesheet. Called only when a map comes near
 * the viewport (or is asked for), so neither is part of any page's first load.
 *
 * @throws If either chunk cannot be fetched; the map then shows its note.
 */
export async function loadMapLibre(): Promise<MapLibre> {
  const [library] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
  return library
}
