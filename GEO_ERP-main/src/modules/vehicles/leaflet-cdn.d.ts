// Leaflet is loaded from a CDN <script> in index.html (see the Fleet map).
// We don't bundle the npm package, so this ambient shim exposes `window.L`.
// The Fleet map uses it loosely; `any` is intentional for the CDN global.
/* eslint-disable @typescript-eslint/no-explicit-any */
export {}

declare global {
  interface Window {
    L: any
  }
}
