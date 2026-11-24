// From the phone's position to the two things the location step produces (see GLOSSARY.md):
// - the location, a short phrase a person would say, shown on Working and Result (VISION invariant 9), and
// - the location detail, the fuller record the lookup gets.

import type { Position } from "./position.ts";
import { reverseGeocode, type ReverseGeocode } from "./nominatim.ts";

/** The fuller record of where the problem is, for the lookup. Never shown on screen as it is. */
export interface LocationDetail {
  /** The exact position from the phone. */
  latitude: number;
  longitude: number;
  /** How far off the phone's reading may be, in metres. Null when the phone did not say. */
  accuracyMeters: number | null;
  /** Address parts under OpenStreetMap's keys (house_number, road, neighbourhood, city, ...). Null when unnamed. */
  address: Record<string, string> | null;
  /** Named things where the phone is, like a station or a library. Empty when there are none or the reading is rough. */
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

/**
 * A landmark is named only when the reading is at least this accurate, so close enough to put the phone at it. Between
 * this and ROUGH_ACCURACY_METERS, the location is the plain street address.
 */
export const LANDMARK_ACCURACY_METERS = 20;

// Kinds of thing with a name that is not a landmark. A road's name is its street ("Sather Road"), and place,
// boundary, and landuse names are areas ("Downtown Berkeley" the neighbourhood, not the station).
const NOT_LANDMARKS = new Set(["highway", "place", "boundary", "landuse"]);

/**
 * A landmark's name with its kind when the name alone does not say what it is: "Downtown Berkeley" is a neighbourhood
 * too, so the station reads "Downtown Berkeley station". A name that already says its kind ("Berkeley Public Library")
 * and a building (whose kind is often just "yes" or "office") keep their name as it is.
 */
function landmarkOf(found: ReverseGeocode): string | null {
  const name = found.name.trim();
  if (!name || NOT_LANDMARKS.has(found.category)) return null;
  const kind = found.type.replaceAll("_", " ").trim();
  if (found.category === "building" || !kind || kind === "yes" || name.toLowerCase().includes(kind.toLowerCase())) {
    return name;
  }
  return `${name} ${kind}`;
}

/** OpenStreetMap can list several house numbers on one building ("2449;2454;2460"). A person says the first. */
function houseNumberOf(address: Record<string, string>): string | undefined {
  return address.house_number?.split(/[;,]/)[0]?.trim() || undefined;
}

/**
 * Farther than this from the building Nominatim matched, the user is likely outside it, on the street, so the
 * location says "In front of". A first guess, to tune on real tests: a house's middle sits about this far back from
 * the sidewalk.
 */
export const IN_FRONT_OF_METERS = 15;

/** Straight-line distance in metres. Flat-earth maths is plenty at the scale of a block. */
function metersBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const metersPerDegree = 111_320;
  const dLat = (a.latitude - b.latitude) * metersPerDegree;
  const dLon = (a.longitude - b.longitude) * metersPerDegree * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/**
 * True when the phone is far enough from the matched building to be standing outside it: farther than
 * IN_FRONT_OF_METERS, and farther than the reading could be off, so the gap is not just the reading's error.
 */
function outsideTheBuilding(found: ReverseGeocode, reading: Reading): boolean {
  if (found.latitude === null || found.longitude === null) return false;
  const distance = metersBetween(reading, { latitude: found.latitude, longitude: found.longitude });
  return distance > Math.max(IN_FRONT_OF_METERS, reading.accuracyMeters ?? 0);
}

/** The phone's reading, as describeLocation needs it. */
export type Reading = Pick<Position, "latitude" | "longitude" | "accuracyMeters">;

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

/** True when the reading is accurate enough to name a landmark. A reading of unknown accuracy counts as accurate. */
function closeEnoughForLandmark(accuracyMeters: number | null): boolean {
  return accuracyMeters === null || accuracyMeters <= LANDMARK_ACCURACY_METERS;
}

/**
 * The location, the way a person would say it: a landmark and its street, or a street address, then the city.
 * Standing outside the matched building says "In front of" its address. A landmark is named only when the reading is
 * accurate to LANDMARK_ACCURACY_METERS. A rough reading says "Near" and names only the street. Null when there is
 * nothing a person would recognize.
 */
export function describeLocation(found: ReverseGeocode | null, reading: Reading): string | null {
  if (!found) return null;
  const { address } = found;
  const rough = isRough(reading.accuracyMeters);
  const landmark = closeEnoughForLandmark(reading.accuracyMeters) ? landmarkOf(found) : null;
  const city = cityOf(address);
  const withCity = (phrase: string) => (city && phrase !== city ? `${phrase}, ${city}` : phrase);

  const road = address.road;
  if (road) {
    if (rough) return `Near ${withCity(road)}`;
    const houseNumber = houseNumberOf(address);
    const street = houseNumber ? `${houseNumber} ${road}` : road;
    if (landmark) return withCity(`${landmark}, ${street}`);
    if (houseNumber && outsideTheBuilding(found, reading)) return `In front of ${withCity(street)}`;
    return withCity(street);
  }

  // No street: a landmark alone, or failing that the neighbourhood, which is never exact enough to drop "Near". A
  // landmark the reading is too rough to put the phone at still says roughly where it is.
  if (landmark) return withCity(landmark);
  const area = areaOf(address);
  if (area) return `Near ${withCity(area)}`;
  const farLandmark = landmarkOf(found);
  if (farLandmark) return `Near ${withCity(farLandmark)}`;
  return null;
}

/**
 * Puts the phone's position into words. It never fails: when the place names cannot be found (no connection, no
 * answer in time, nothing there), the location is null and the detail still carries the exact position.
 */
export async function findLocation(position: Position): Promise<FoundLocation> {
  const exact = {
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
    location: describeLocation(found, position),
    detail: {
      ...exact,
      address: found ? { ...found.address } : null,
      landmarks: landmark && !isRough(position.accuracyMeters) ? [landmark] : [],
    },
  };
}
