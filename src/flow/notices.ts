// Messages for Home when a run stops early. Each says what happened and what to do next (Nielsen 9).
// A denied location does not use these: it opens the Location needed screen, where Ask again keeps the photo.
export const NOTICES = {
  notAPhoto: "That file is not a photo, so FixFinder stopped. Tap Take a photo to try again.",
  locationFailed: "FixFinder could not find your location, so it stopped. Tap Take a photo to try again.",
  locationUnsupported: "This browser cannot share your location with FixFinder, so it stopped.",
  // TEMPORARY for round 1 of #25. Round 2 replaces these with the photo step's own next steps on Working.
  photoUnclear: "FixFinder couldn't tell what the problem is from this photo. Tap Take a photo to try again.",
  photoReaderUnreachable: "FixFinder couldn't reach its photo reader, so it stopped. Tap Take a photo to try again.",
  lookupFailed: "FixFinder could not find who is responsible, so it stopped. Tap Take a photo to try again.",
} as const;
