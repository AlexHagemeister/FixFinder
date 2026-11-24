import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeLocation,
  findLocation,
  IN_FRONT_OF_METERS,
  ROUGH_ACCURACY_METERS,
  type Reading,
} from "./location-detail.ts";
import { clearGeocodeCache, type ReverseGeocode } from "./nominatim.ts";

// Answers shaped like Nominatim's, from real lookups on 2026-11-24 at public spots. Each sits at the matched thing's
// own position, so a reading taken right there is inside it.
const BART_STATION: ReverseGeocode = {
  name: "Downtown Berkeley",
  category: "railway",
  type: "station",
  address: {
    railway: "Downtown Berkeley",
    house_number: "2160",
    road: "Shattuck Avenue",
    neighbourhood: "Downtown Berkeley",
    city: "Berkeley",
  },
  latitude: 37.8701,
  longitude: -122.2681,
};
const PEDESTRIAN_ROAD: ReverseGeocode = {
  name: "Sather Road",
  category: "highway",
  type: "pedestrian",
  address: { road: "Sather Road", neighbourhood: "Southside", city: "Berkeley" },
  latitude: 37.8703,
  longitude: -122.2595,
};
const OFFICE: ReverseGeocode = {
  name: "",
  category: "building",
  type: "office",
  address: { house_number: "3017", road: "Telegraph Avenue", city: "Berkeley" },
  latitude: 37.8555,
  longitude: -122.2597,
};
// One building with several house numbers, as OpenStreetMap lists them.
const SEVERAL_NUMBERS: ReverseGeocode = {
  name: "",
  category: "building",
  type: "yes",
  address: { house_number: "2449;2454;2460;2464", road: "Telegraph Avenue", city: "Berkeley" },
  latitude: 37.8657,
  longitude: -122.2589,
};
const NAMED_BUILDING: ReverseGeocode = {
  name: "Doe Library",
  category: "building",
  type: "university",
  address: { building: "Doe Library", road: "Sather Road", city: "Berkeley" },
  latitude: 37.8722,
  longitude: -122.2593,
};
const NAME_SAYS_ITS_KIND: ReverseGeocode = {
  name: "César Chávez Dog Park",
  category: "leisure",
  type: "dog_park",
  address: { leisure: "César Chávez Dog Park", road: "Spinnaker Way", city: "Berkeley" },
  latitude: 37.879,
  longitude: -122.319,
};
// San Francisco, by the Ferry Building: FixFinder's location works outside Berkeley too.
const SAN_FRANCISCO: ReverseGeocode = {
  name: "",
  category: "amenity",
  type: "waste_basket",
  address: { house_number: "1", road: "Herb Caen Way...", quarter: "Financial District", city: "San Francisco" },
  latitude: 37.7955,
  longitude: -122.3937,
};
const AREA_ONLY: ReverseGeocode = {
  name: "Downtown Berkeley",
  category: "place",
  type: "neighbourhood",
  address: { neighbourhood: "Downtown Berkeley", city: "Berkeley" },
  latitude: 37.87,
  longitude: -122.268,
};

const EXACT = 10;
const ROUGH = ROUGH_ACCURACY_METERS + 1;
// One metre north is about 1 / 111,320 of a degree of latitude.
const METER = 1 / 111_320;

/** A reading at the matched thing itself, or `northMeters` north of it. */
function at(found: ReverseGeocode, accuracyMeters: number | null = EXACT, northMeters = 0): Reading {
  return { latitude: found.latitude! + northMeters * METER, longitude: found.longitude!, accuracyMeters };
}

describe("describeLocation", () => {
  it("names a landmark with its kind, its street address, and the city", () => {
    expect(describeLocation(BART_STATION, at(BART_STATION))).toBe(
      "Downtown Berkeley station, 2160 Shattuck Avenue, Berkeley",
    );
  });

  it("leaves the kind off a name that already says it", () => {
    expect(describeLocation(NAME_SAYS_ITS_KIND, at(NAME_SAYS_ITS_KIND))).toBe(
      "César Chávez Dog Park, Spinnaker Way, Berkeley",
    );
  });

  it("leaves the kind off a named building", () => {
    expect(describeLocation(NAMED_BUILDING, at(NAMED_BUILDING))).toBe("Doe Library, Sather Road, Berkeley");
  });

  it("gives a street address when nothing named is there", () => {
    expect(describeLocation(OFFICE, at(OFFICE))).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("gives only the first of several house numbers", () => {
    expect(describeLocation(SEVERAL_NUMBERS, at(SEVERAL_NUMBERS))).toBe("2449 Telegraph Avenue, Berkeley");
  });

  it("says In front of when the phone is outside the matched building", () => {
    expect(describeLocation(OFFICE, at(OFFICE, EXACT, IN_FRONT_OF_METERS + 5))).toBe(
      "In front of 3017 Telegraph Avenue, Berkeley",
    );
  });

  it("does not say In front of when the phone is at the building", () => {
    expect(describeLocation(OFFICE, at(OFFICE, EXACT, IN_FRONT_OF_METERS - 5))).toBe(
      "3017 Telegraph Avenue, Berkeley",
    );
  });

  it("does not count a road's own name as a landmark", () => {
    expect(describeLocation(PEDESTRIAN_ROAD, at(PEDESTRIAN_ROAD))).toBe("Sather Road, Berkeley");
  });

  it("works outside Berkeley", () => {
    expect(describeLocation(SAN_FRANCISCO, at(SAN_FRANCISCO))).toBe("1 Herb Caen Way..., San Francisco");
  });

  it("says Near and names only the street when the reading is rough", () => {
    expect(describeLocation(BART_STATION, at(BART_STATION, ROUGH))).toBe("Near Shattuck Avenue, Berkeley");
    expect(describeLocation(OFFICE, at(OFFICE, ROUGH, 40))).toBe("Near Telegraph Avenue, Berkeley");
  });

  it("treats a reading right at the line as exact", () => {
    expect(describeLocation(OFFICE, at(OFFICE, ROUGH_ACCURACY_METERS))).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("treats a reading of unknown accuracy as exact", () => {
    expect(describeLocation(OFFICE, at(OFFICE, null))).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("falls back to Near the neighbourhood when there is no street", () => {
    expect(describeLocation(AREA_ONLY, at(AREA_ONLY))).toBe("Near Downtown Berkeley, Berkeley");
  });

  it("gives nothing when there is nothing a person would recognize", () => {
    const reading = { latitude: 37.86, longitude: -122.34, accuracyMeters: EXACT };
    expect(describeLocation(null, reading)).toBeNull();
    const ocean = { name: "", category: "", type: "", address: { country: "United States" }, latitude: null, longitude: null };
    expect(describeLocation(ocean, reading)).toBeNull();
  });
});

describe("findLocation", () => {
  const position = { latitude: 37.87012, longitude: -122.26812, accuracyMeters: EXACT };

  beforeEach(() => clearGeocodeCache());
  afterEach(() => vi.unstubAllGlobals());

  // Nominatim's own shape: the matched thing's position comes as text under lat and lon.
  function answerWith(found: ReverseGeocode | { error: string }) {
    const body =
      "error" in found
        ? found
        : { ...found, lat: String(found.latitude), lon: String(found.longitude), latitude: undefined, longitude: undefined };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("returns the location and the location detail, with landmarks", async () => {
    answerWith(BART_STATION);
    const found = await findLocation(position);
    expect(found.location).toBe("Downtown Berkeley station, 2160 Shattuck Avenue, Berkeley");
    expect(found.detail).toEqual({
      latitude: 37.87012,
      longitude: -122.26812,
      accuracyMeters: EXACT,
      address: BART_STATION.address,
      landmarks: ["Downtown Berkeley station"],
    });
  });

  it("reads the matched thing's position from Nominatim's text", async () => {
    // The phone is about 30 m north of the office, so the location says In front of.
    answerWith(OFFICE);
    const found = await findLocation({ latitude: OFFICE.latitude! + 30 * METER, longitude: OFFICE.longitude!, accuracyMeters: EXACT });
    expect(found.location).toBe("In front of 3017 Telegraph Avenue, Berkeley");
  });

  it("leaves landmarks out of the detail when the reading is rough", async () => {
    answerWith(BART_STATION);
    const found = await findLocation({ ...position, accuracyMeters: ROUGH });
    expect(found.detail.landmarks).toEqual([]);
  });

  it("asks Nominatim for the spot rounded to about 11 m, and reuses the answer for the same spot", async () => {
    const fetchMock = answerWith(OFFICE);
    await findLocation(position);
    await findLocation({ ...position, latitude: 37.87014 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/reverse");
    expect(url.searchParams.get("lat")).toBe("37.8701");
    expect(url.searchParams.get("lon")).toBe("-122.2681");
  });

  it("keeps the exact spot when Nominatim cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const found = await findLocation(position);
    expect(found.location).toBeNull();
    expect(found.detail).toEqual({ ...position, address: null, landmarks: [] });
  });

  it("keeps the exact spot when Nominatim has nothing there", async () => {
    answerWith({ error: "Unable to geocode" });
    const found = await findLocation(position);
    expect(found.location).toBeNull();
    expect(found.detail.address).toBeNull();
  });

  it("keeps the exact spot when Nominatim answers with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));
    const found = await findLocation(position);
    expect(found.location).toBeNull();
  });
});
