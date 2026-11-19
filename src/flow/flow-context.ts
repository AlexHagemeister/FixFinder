import { createContext, useContext } from "react";
import type { LookupResponse } from "../lookup/lookup.ts";

/** The three steps the Working screen shows, in order. */
export type StepId = "photo" | "location" | "responsibleParty";
export const STEP_ORDER: readonly StepId[] = ["photo", "location", "responsibleParty"];

export type StepStatus = "waiting" | "current" | "done";

export interface FlowState {
  /** The photo for the report in progress, held in memory only. `url` is an object URL for showing it. */
  photo: { file: File; url: string } | null;
  steps: Record<StepId, StepStatus>;
  result: LookupResponse | null;
  /** A short message for Home when a run stopped early, such as when location was denied. */
  notice: string | null;
}

export interface FlowActions {
  /** Starts a report from a photo the user just took. Opens the Working screen and runs the steps. */
  startReport: (file: File) => void;
}

export type FlowValue = FlowState & FlowActions;

export const FlowContext = createContext<FlowValue | null>(null);

export function useReportFlow(): FlowValue {
  const value = useContext(FlowContext);
  if (!value) throw new Error("useReportFlow must be used inside ReportFlow (see src/routes.tsx).");
  return value;
}
