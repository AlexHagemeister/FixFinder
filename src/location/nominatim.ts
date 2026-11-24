// Turns a position into place names with Nominatim, OpenStreetMap's free reverse lookup. This is the only file that
// knows which service FixFinder uses, so swapping it (for Google's, say) changes this file alone.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/) allows lookups the user starts,
// for a moderate number of users, at most one a second. The phone calls it directly: the browser's Referer names
// FixFinder, which the policy accepts in place of a custom User-Agent. Result credits OpenStreetMap, as it also asks.

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

/** How long FixFinder waits for an answer before carrying on without one. */
export const GEOCODE_TIMEOUT_MS = 5_000;

/** What Nominatim knows about a spot, cut down to what FixFinder uses. */
export interface ReverseGeocode {
  /** The name of the thing at the spot, like "Downtown Berkeley" (a station) or "Sather Road". Empty when unnamed. */
  name: string;
  /** OpenStreetMap's kind of thing, like "railway", "highway", or "building". */
  category: string;
  /** The finer kind within the category, like "station" or "pedestrian". */
  type: string;
  /** Address parts under OpenStreetMap's keys: house_number, road, neighbourhood, city, postcode, and so on. */
  address: Record<string, string>;
}

// Coordinates rounded to 4 decimals (about 11 m) are one spot, so a retake from the same place reuses the answer, as
// the usage policy asks, instead of asking again. The rounded spot is also what goes to Nominatim, so the answer a
// retake reuses is exactly the one it would get.
const cache = new Map<string, ReverseGeocode | null>();

/** Forgets every answer. Tests use it so one test's answer does not leak into the next. */
export function clearGeocodeCache() {
  cache.clear();
}

/**
 * What Nominatim knows about the spot, or null when it has nothing there (the open ocean, say).
 * Throws when it cannot be reached or does not answer within GEOCODE_TIMEOUT_MS.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocode | null> {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  const key = `${lat},${lon}`;
  if (cache.has(key)) return cache.get(key)!;

  // zoom 18 asks for the most detailed answer: a building or address, not just the street or neighbourhood.
  const url = `${ENDPOINT}?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
  const body = (await response.json()) as Partial<ReverseGeocode> & { error?: string };

  // Nominatim says "Unable to geocode" when nothing is there. That is an answer, so it is remembered too.
  const result: ReverseGeocode | null = body.error
    ? null
    : {
        name: body.name ?? "",
        category: body.category ?? "",
        type: body.type ?? "",
        address: body.address ?? {},
      };
  cache.set(key, result);
  return result;
}
