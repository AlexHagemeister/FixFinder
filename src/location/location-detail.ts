// From the phone's position to the two things the location step produces (see GLOSSARY.md):
// - the location, a short phrase a person would say, shown on Working and Result (VISION invariant 9), and
// - the location detail, the fuller record the lookup gets.

import type { Position } from "./position.ts";
import { reverseGeocode, type ReverseGeocode } from "./nominatim.ts";

/** The fuller record of where the problem is, for the lookup. Never shown on screen as it is. */
export interface LocationDetail {
  /** The exact spot from the phone. */
  latitude: number;
  longitude: number;
  /** How far off the phone's reading may be, in metres. Null when the phone did not say. */
  accuracyMeters: number | null;
  /** Address parts under OpenStreetMap's keys (house_number, road, neighbourhood, city, ...). Null when unnamed. */
  address: Record<string, string> | null;
  /** Named things at the spot, like a station or a library. Empty when there are none or the reading is rough. */
  landmarks: string[];
}

/** What the location step found. */
export interface FoundLocation {
  /** The location, like "2160 Shattuck Avenue, Berkeley". Null when FixFinder could not put it into words. */
  location: string | null;
  detail: LocationDetail;
}

/**
 * A reading less accurate than this is rough: it could be the next building over, or across the street, so the
 * location says "Near" and names the street without a house number or landmark. About half a Berkeley block.
 */
export const ROUGH_ACCURACY_METERS = 50;

// Kinds of thing with a name that is not a landmark. A road's name is its street ("Sather Road"), and place,
// boundary, and landuse names are areas ("Downtown Berkeley" the neighbourhood, not the station).
const NOT_LANDMARKS = new Set(["highway", "place", "boundary", "landuse"]);

function landmarkOf(found: ReverseGeocode): string | null {
  const name = found.name.trim();
  return name && !NOT_LANDMARKS.has(found.category) ? name : null;
}

function cityOf(address: Record<string, string>): string | undefined {
  return address.city ?? address.town ?? address.village ?? address.hamlet;
}

function areaOf(address: Record<string, string>): string | undefined {
  return address.neighbourhood ?? address.quarter ?? address.suburb;
}

/** True when the phone's reading could be off by more than ROUGH_ACCURACY_METERS. */
export function isRough(accuracyMeters: number | null): boolean {
  return accuracyMeters !== null && accuracyMeters > ROUGH_ACCURACY_METERS;
}

/**
 * The location, the way a person would say it: a landmark and its street, or a street address, then the city.
 * A rough reading says "Near" and names only the street. Null when there is nothing a person would recognize.
 */
export function describeLocation(found: ReverseGeocode | null, accuracyMeters: number | null): string | null {
  if (!found) return null;
  const { address } = found;
  const rough = isRough(accuracyMeters);
  const city = cityOf(address);
  const withCity = (phrase: string) => (city && phrase !== city ? `${phrase}, ${city}` : phrase);

  const road = address.road;
  if (road) {
    if (rough) return `Near ${withCity(road)}`;
    const street = address.house_number ? `${address.house_number} ${road}` : road;
    const landmark = landmarkOf(found);
    return withCity(landmark ? `${landmark}, ${street}` : street);
  }

  // No street: a landmark alone, or failing that the neighbourhood, which is never exact enough to drop "Near".
  const landmark = landmarkOf(found);
  if (landmark && !rough) return withCity(landmark);
  const area = areaOf(address);
  if (area) return `Near ${withCity(area)}`;
  return null;
}

/**
 * Puts the phone's position into words. It never fails: when the place names cannot be found (no connection, no
 * answer in time, nothing there), the location is null and the detail still carries the exact spot.
 */
export async function findLocation(position: Position): Promise<FoundLocation> {
  const spot = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracyMeters: position.accuracyMeters,
  };
  let found: ReverseGeocode | null = null;
  try {
    found = await reverseGeocode(position.latitude, position.longitude);
  } catch {
    found = null;
  }
  const landmark = found ? landmarkOf(found) : null;
  return {
    location: describeLocation(found, position.accuracyMeters),
    detail: {
      ...spot,
      address: found ? { ...found.address } : null,
      landmarks: landmark && !isRough(position.accuracyMeters) ? [landmark] : [],
    },
  };
}
