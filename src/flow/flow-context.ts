import { createContext, useContext } from "react";
import type { FoundLocation } from "../location/location-detail.ts";
import type { LookupResponse } from "../lookup/lookup.ts";

/** The three steps the Working screen shows, in order. */
export type StepId = "photo" | "location" | "responsibleParty";
export const STEP_ORDER: readonly StepId[] = ["photo", "location", "responsibleParty"];

export type StepStatus = "waiting" | "current" | "done";

export interface FlowState {
  /**
   * The photo for the report in progress, held in memory. `url` is an object URL for showing it. While the Location
   * needed screen is open, a copy is also saved on the phone (see saved-photo.ts) so a reload can pick the report up.
   */
  photo: { file: File; url: string } | null;
  steps: Record<StepId, StepStatus>;
  /** What the location step found: the location to show, and the location detail for the lookup. */
  location: FoundLocation | null;
  /** The location the user confirmed on the map. The original location remains associated with the lookup. */
  correctedLocation?: FoundLocation;
  result: LookupResponse | null;
  /** A short message for Home when a run stopped early, such as when the location could not be found. */
  notice: string | null;
  /**
   * Set when the user denied location, which opens the Location needed screen. `phoneWillNotAsk` is true when the
   * phone likely will not show its prompt again, so the screen lists the steps for turning location on in Settings.
   * `stillOff` is true when the denial answered an Ask again, so the screen says location is still off.
   */
  locationNeeded: { phoneWillNotAsk: boolean; stillOff: boolean } | null;
}

export interface FlowActions {
  /** Starts a report from a photo the user just took. Opens the Working screen and runs the steps. */
  startReport: (file: File) => void;
  /**
   * Asks for location again after a denial. The report in progress carries on from the location step, same photo.
   * It saves the photo and reloads the page, since Safari keeps a denial for the life of the page.
   */
  askAgain: () => void;
  setCorrectedLocation: (location: FoundLocation) => void;
}

export type FlowValue = FlowState & FlowActions;

export const FlowContext = createContext<FlowValue | null>(null);

export function useReportFlow(): FlowValue {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useReportFlow must be used inside ReportFlow (see src/routes.tsx).");
  return value;
}
