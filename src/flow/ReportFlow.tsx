import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { getPosition, PositionError, type Position } from "../location/position.ts";
import { lookup, type LookupResponse } from "../lookup/lookup.ts";
import { FlowContext, type FlowState, type FlowValue, type StepId, type StepStatus } from "./flow-context.ts";
import { NOTICES } from "./notices.ts";
import { FINISH_PAUSE_MS, STEP_MIN_MS } from "./timing.ts";

function positionNotice(error: unknown): string {
  if (error instanceof PositionError) {
    if (error.reason === "denied") return NOTICES.locationDenied;
    if (error.reason === "unsupported") return NOTICES.locationUnsupported;
  }
  return NOTICES.locationFailed;
}

const ALL_WAITING: Record<StepId, StepStatus> = { photo: "waiting", location: "waiting", responsibleParty: "waiting" };
const EMPTY: FlowState = { photo: null, steps: ALL_WAITING, result: null, notice: null };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Holds the report in progress for the Working and Result screens, and runs its steps.
// It is the root route's element, so every screen (and every test that renders `routes`) sits inside it.
export function ReportFlow() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [state, setState] = useState<FlowState>(EMPTY);
  // Each run gets a number. A run that is no longer the latest (cancelled or replaced) stops quietly.
  const runRef = useRef(0);
  const photoUrlRef = useRef<string | null>(null);

  const releasePhoto = useCallback(() => {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
    }
  }, []);

  // Landing on Home ends any report in progress, however the user got there: Cancel, Retake photo, Done, the back
  // gesture, or a run that stopped early. A stopped run's notice stays so Home can show it.
  useEffect(() => {
    if (pathname !== "/") return;
    runRef.current += 1;
    releasePhoto();
    setState((current) => ({ ...EMPTY, notice: current.notice }));
  }, [pathname, releasePhoto]);

  const startReport = useCallback(
    (file: File) => {
      const run = ++runRef.current;
      const isLatest = () => runRef.current === run;
      const setSteps = (steps: Partial<Record<StepId, StepStatus>>) =>
        setState((current) => ({ ...current, steps: { ...current.steps, ...steps } }));
      const stop = (notice: string) => {
        if (!isLatest()) return;
        setState((current) => ({ ...current, notice }));
        navigate("/", { replace: true });
      };

      releasePhoto();
      const url = URL.createObjectURL(file);
      photoUrlRef.current = url;
      setState({ photo: { file, url }, steps: { ...ALL_WAITING, photo: "current" }, result: null, notice: null });
      navigate("/working");

      void (async () => {
        // Step 1: reading the photo. Some phones leave the file's kind blank, so only a known non-photo stops here.
        if (file.type && !file.type.startsWith("image/")) return stop(NOTICES.notAPhoto);
        await pause(STEP_MIN_MS);
        if (!isLatest()) return;
        setSteps({ photo: "done", location: "current" });

        // Step 2: pinning down the location.
        let position: Position;
        try {
          [position] = await Promise.all([getPosition(), pause(STEP_MIN_MS)]);
        } catch (error) {
          return stop(positionNotice(error));
        }
        if (!isLatest()) return;
        setSteps({ location: "done", responsibleParty: "current" });

        // Step 3: finding who is responsible.
        let result: LookupResponse;
        try {
          [result] = await Promise.all([
            lookup({ photo: file, latitude: position.latitude, longitude: position.longitude }),
            pause(STEP_MIN_MS),
          ]);
        } catch {
          return stop(NOTICES.lookupFailed);
        }
        if (!isLatest()) return;
        setState((current) => ({ ...current, result, steps: { ...current.steps, responsibleParty: "done" } }));

        await pause(FINISH_PAUSE_MS);
        if (!isLatest()) return;
        // Replace, so the back gesture from Result skips the finished Working screen.
        navigate("/result", { replace: true });
      })();
    },
    [navigate, releasePhoto],
  );

  const value = useMemo<FlowValue>(() => ({ ...state, startReport }), [state, startReport]);

  return (
    <FlowContext value={value}>
      <Outlet />
    </FlowContext>
  );
}
