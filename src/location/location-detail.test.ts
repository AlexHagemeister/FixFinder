import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeLocation, findLocation, ROUGH_ACCURACY_METERS } from "./location-detail.ts";
import { clearGeocodeCache, type ReverseGeocode } from "./nominatim.ts";

// Answers shaped like Nominatim's, from real lookups on 2026-11-24 at public spots.
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
};
const PEDESTRIAN_ROAD: ReverseGeocode = {
  name: "Sather Road",
  category: "highway",
  type: "pedestrian",
  address: { road: "Sather Road", neighbourhood: "Southside", city: "Berkeley" },
};
const OFFICE: ReverseGeocode = {
  name: "",
  category: "building",
  type: "office",
  address: { house_number: "3017", road: "Telegraph Avenue", city: "Berkeley" },
};
// San Francisco, by the Ferry Building: FixFinder's location works outside Berkeley too.
const SAN_FRANCISCO: ReverseGeocode = {
  name: "",
  category: "amenity",
  type: "waste_basket",
  address: { house_number: "1", road: "Herb Caen Way...", quarter: "Financial District", city: "San Francisco" },
};
const AREA_ONLY: ReverseGeocode = {
  name: "Downtown Berkeley",
  category: "place",
  type: "neighbourhood",
  address: { neighbourhood: "Downtown Berkeley", city: "Berkeley" },
};

const EXACT = 10;
const ROUGH = ROUGH_ACCURACY_METERS + 1;

describe("describeLocation", () => {
  it("names a landmark with its street address and city", () => {
    expect(describeLocation(BART_STATION, EXACT)).toBe("Downtown Berkeley, 2160 Shattuck Avenue, Berkeley");
  });

  it("gives a street address when nothing named is there", () => {
    expect(describeLocation(OFFICE, EXACT)).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("does not count a road's own name as a landmark", () => {
    expect(describeLocation(PEDESTRIAN_ROAD, EXACT)).toBe("Sather Road, Berkeley");
  });

  it("works outside Berkeley", () => {
    expect(describeLocation(SAN_FRANCISCO, EXACT)).toBe("1 Herb Caen Way..., San Francisco");
  });

  it("says Near and names only the street when the reading is rough", () => {
    expect(describeLocation(BART_STATION, ROUGH)).toBe("Near Shattuck Avenue, Berkeley");
  });

  it("treats a reading right at the line as exact", () => {
    expect(describeLocation(OFFICE, ROUGH_ACCURACY_METERS)).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("treats a reading of unknown accuracy as exact", () => {
    expect(describeLocation(OFFICE, null)).toBe("3017 Telegraph Avenue, Berkeley");
  });

  it("falls back to Near the neighbourhood when there is no street", () => {
    expect(describeLocation(AREA_ONLY, EXACT)).toBe("Near Downtown Berkeley, Berkeley");
  });

  it("gives nothing when there is nothing a person would recognize", () => {
    expect(describeLocation(null, EXACT)).toBeNull();
    expect(describeLocation({ name: "", category: "", type: "", address: { country: "United States" } }, EXACT)).toBeNull();
  });
});

describe("findLocation", () => {
  const position = { latitude: 37.87012, longitude: -122.26812, accuracyMeters: EXACT };

  beforeEach(() => clearGeocodeCache());
  afterEach(() => vi.unstubAllGlobals());

  function answerWith(body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("returns the location and the location detail, with landmarks", async () => {
    answerWith(BART_STATION);
    const found = await findLocation(position);
    expect(found.location).toBe("Downtown Berkeley, 2160 Shattuck Avenue, Berkeley");
    expect(found.detail).toEqual({
      latitude: 37.87012,
      longitude: -122.26812,
      accuracyMeters: EXACT,
      address: BART_STATION.address,
      landmarks: ["Downtown Berkeley"],
    });
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
