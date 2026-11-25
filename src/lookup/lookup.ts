// The lookup: from a photo and where the user is standing, find the problem's category and its responsible party.
//
// This is a stand-in. It has the shape of the future Supabase Edge Function, so the round trip later replaces the
// body of `lookup` with a `fetch` to that function and no screen changes. It makes no network or AI calls.

import type { LocationDetail } from "../location/location-detail.ts";

/** What the app sends to the lookup. */
export interface LookupRequest {
  /** The photo the user took, as the camera returned it. */
  photo: Blob;
  /** Where the problem is: the exact position, how accurate it is, the address parts, and landmarks there. */
  location: LocationDetail;
}

/** Where FixFinder's answer about the responsible party came from, so the user can check it (VISION invariant 4). */
export interface LookupSource {
  /** Who published the source and which page it is, in words a person reads. */
  name: string;
  url: string;
}

/** What the lookup sends back. */
export interface LookupResponse {
  /** The kind of problem, like "Pothole". */
  category: string;
  /** One or two plain sentences about the problem. */
  description: string;
  /** The responsible party by its public name, like "Berkeley Public Works". */
  responsibleParty: string;
  source: LookupSource;
  /** True when the answer is sample output and not a real reading of the photo. The Result screen says so. */
  placeholder: boolean;
}

/** How long the stand-in pretends to work, so the Working screen shows its last step. */
export const PLACEHOLDER_DELAY_MS = 1200;

const PLACEHOLDER_RESPONSE: LookupResponse = {
  category: "Pothole",
  description: "A hole in the road surface, deep enough to damage a tire or throw a cyclist.",
  responsibleParty: "Berkeley Public Works",
  source: {
    name: "City of Berkeley, Street Repair page",
    url: "https://berkeleyca.gov/city-services/streets-sidewalks-sewers-and-utilities/street-repair",
  },
  placeholder: true,
};

export async function lookup(_request: LookupRequest): Promise<LookupResponse> {
  await new Promise((resolve) => setTimeout(resolve, PLACEHOLDER_DELAY_MS));
  return { ...PLACEHOLDER_RESPONSE, source: { ...PLACEHOLDER_RESPONSE.source } };
}
