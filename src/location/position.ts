// Asks the phone where the user is standing. The result is raw latitude and longitude, and how accurate they are.
// It is never shown on screen: location-detail.ts puts it into words (VISION invariant 9).

export interface Position {
  latitude: number;
  longitude: number;
  /** How far off the reading may be, in metres. Null when the phone did not say. */
  accuracyMeters: number | null;
}

/** Why FixFinder could not get a position. */
export type PositionFailure = "denied" | "unavailable" | "timeout" | "unsupported";

export class PositionError extends Error {
  readonly reason: PositionFailure;

  constructor(reason: PositionFailure) {
    super(`Could not get a position: ${reason}`);
    this.name = "PositionError";
    this.reason = reason;
  }
}

// Without a timeout, iOS in home-screen mode can leave the request waiting forever.
// The browser starts this clock after the user answers the permission prompt, not while the prompt is open.
export const POSITION_TIMEOUT_MS = 15_000;

// A position up to 30 seconds old is still where the user is standing.
const POSITION_MAX_AGE_MS = 30_000;

// GeolocationPositionError codes, written out because jsdom and some browsers lack the named constants.
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

export function getPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    // Missing on old browsers and on any page not served over https (for example a phone on the dev server's LAN address).
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new PositionError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (found) =>
        resolve({
          latitude: found.coords.latitude,
          longitude: found.coords.longitude,
          accuracyMeters: Number.isFinite(found.coords.accuracy) ? found.coords.accuracy : null,
        }),
      (error) => {
        const reason: PositionFailure =
          error.code === PERMISSION_DENIED ? "denied" : error.code === POSITION_UNAVAILABLE ? "unavailable" : "timeout";
        reject(new PositionError(reason));
      },
      // High accuracy, because the responsible party can change from one side of a street to the other.
      { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: POSITION_MAX_AGE_MS },
    );
  });
}
