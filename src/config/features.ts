// Feature flags. Flipping a flag toggles a feature WITHOUT deleting its code,
// so work-in-progress stays in the codebase.
//
// fleetMap: the real Fleet map (the «الخريطة/Map» tab and the mini map on the
//   Vehicles tab). While this is OFF, those spots show a «قريباً / coming soon»
//   placeholder instead of the real map — nothing is removed. Set to `true` to
//   show the real map once it's ready.
export const FEATURES = {
  fleetMap: true,
}
