/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** 'true' serves typed mock data instead of calling the API (see src/lib/api/mode.ts). */
  readonly VITE_USE_MOCKS?: string
  /** Public VAPID key for push subscriptions (docs/api/push.md). Public by design; the private key stays on the server. */
  readonly VITE_VAPID_PUBLIC_KEY?: string
  /** The map style (tile provider) for the landing page's service-area map (#346). Public by design. */
  readonly VITE_MAP_STYLE_URL?: string
  /** 'true' shows the message form on `/contact` (#344, src/lib/features.ts). Off when unset. Public; read at build time. */
  readonly VITE_CONTACT_FORM_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Build-time: true when the build serves mocks (`vite.config.ts`). A literal, so a build without mocks drops `src/mocks/`. */
declare const __USE_MOCKS__: boolean
