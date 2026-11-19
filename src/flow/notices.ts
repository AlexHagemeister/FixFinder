// Messages for Home when a run stops early. Each says what happened and what to do next (Nielsen 9).
export const NOTICES = {
  notAPhoto: "That file is not a photo, so FixFinder stopped. Tap Take a photo to try again.",
  locationDenied:
    "FixFinder needs your location to find who is responsible, so it stopped. Tap Take a photo to try again, and choose Allow when your phone asks.",
  locationFailed: "FixFinder could not find your location, so it stopped. Tap Take a photo to try again.",
  locationUnsupported: "This browser cannot share your location with FixFinder, so it stopped.",
  lookupFailed: "FixFinder could not find who is responsible, so it stopped. Tap Take a photo to try again.",
} as const;
