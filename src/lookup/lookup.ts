// The lookup: from a photo and where the user is standing, find the problem's responsible party.
//
// This is a stand-in. It has the shape of a future Worker route (see README § Where the AI runs), so the real lookup
// later replaces the body of `lookup` with a `fetch` and no screen changes. It makes no network or AI calls. The
// description comes from the photo reader (describe-photo.ts), not from here.

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
  /** The responsible party by its public name, like "Berkeley Public Works". */
  responsibleParty: string;
  source: LookupSource;
  /** True when the answer is sample output and not a real lookup. The Result screen says so. */
  placeholder: boolean;
}

/** How long the stand-in pretends to work, so the Working screen shows its last step. */
export const PLACEHOLDER_DELAY_MS = 1200;

const PLACEHOLDER_RESPONSE: LookupResponse = {
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
