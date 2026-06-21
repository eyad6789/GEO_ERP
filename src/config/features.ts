// Feature flags. Flipping a flag shows/hides a feature WITHOUT deleting its code,
// so work-in-progress can stay in the codebase while being hidden from the app.
//
// fleetMap: the Fleet «الخريطة/Map» tab and the mini map on the Vehicles tab.
//   Temporarily OFF while the map is being finished. Set to `true` to bring it
//   back — no other change needed.
export const FEATURES = {
  fleetMap: false,
}
