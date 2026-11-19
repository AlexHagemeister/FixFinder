import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { phoneWillNotAskAgain } from "../location/permission.ts";
import { getPosition, PositionError, type Position } from "../location/position.ts";
import { lookup, type LookupResponse } from "../lookup/lookup.ts";
import { FlowContext, type FlowState, type FlowValue, type StepId, type StepStatus } from "./flow-context.ts";
import { NOTICES } from "./notices.ts";
import { FINISH_PAUSE_MS, STEP_MIN_MS } from "./timing.ts";

// A denial never reaches this: it opens the Location needed screen instead of a notice on Home.
function positionNotice(error: unknown): string {
  if (error instanceof PositionError && error.reason === "unsupported") return NOTICES.locationUnsupported;
  return NOTICES.locationFailed;
}

/** How the ask for location ended. `answeredInMs` times the ask alone, without the step's pacing pause. */
type PositionOutcome = { position: Position } | { error: unknown; answeredInMs: number };

const ALL_WAITING: Record<StepId, StepStatus> = { photo: "waiting", location: "waiting", responsibleParty: "waiting" };
const EMPTY: FlowState = { photo: null, steps: ALL_WAITING, result: null, notice: null, locationNeeded: null };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Holds the report in progress for the Working, Location needed, and Result screens, and runs its steps.
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

  // Landing on Home ends any report in progress, however the user got there: Cancel, Not now, Retake photo, Done, the
  // back gesture, or a run that stopped early. A stopped run's notice stays so Home can show it.
  useEffect(() => {
    if (pathname !== "/") return;
    runRef.current += 1;
    releasePhoto();
    setState((current) => ({ ...EMPTY, notice: current.notice }));
  }, [pathname, releasePhoto]);

  // Runs the report's steps for `file`. A new report starts at the photo step. Ask again starts at the location step,
  // so the photo step stays done and the same photo goes to the lookup.
  const runSteps = useCallback(
    (file: File, from: "photo" | "location") => {
      const run = ++runRef.current;
      const isLatest = () => runRef.current === run;
      const setSteps = (steps: Partial<Record<StepId, StepStatus>>) =>
        setState((current) => ({ ...current, steps: { ...current.steps, ...steps } }));
      const stop = (notice: string) => {
        if (!isLatest()) return;
        setState((current) => ({ ...current, notice }));
        navigate("/", { replace: true });
      };

      void (async () => {
        if (from === "photo") {
          // Step 1: reading the photo. Some phones leave the file's kind blank, so only a known non-photo stops here.
          if (file.type && !file.type.startsWith("image/")) return stop(NOTICES.notAPhoto);
          await pause(STEP_MIN_MS);
          if (!isLatest()) return;
          setSteps({ photo: "done", location: "current" });
        }

        // Step 2: pinning down the location. A failure also waits out the step's pause, so after Ask again the
        // Working screen shows "Asking your phone where you are" before a second denial leads back.
        const askedAt = Date.now();
        const [outcome] = await Promise.all([
          getPosition().then(
            (position): PositionOutcome => ({ position }),
            (error: unknown): PositionOutcome => ({ error, answeredInMs: Date.now() - askedAt }),
          ),
          pause(STEP_MIN_MS),
        ]);
        if (!isLatest()) return;
        if ("error" in outcome) {
          if (!(outcome.error instanceof PositionError && outcome.error.reason === "denied")) {
            return stop(positionNotice(outcome.error));
          }
          // Denied: FixFinder stops here and does not look anything up. The photo stays in memory for Ask again.
          const phoneWillNotAsk = await phoneWillNotAskAgain(outcome.answeredInMs);
          if (!isLatest()) return;
          setState((current) => ({ ...current, locationNeeded: { phoneWillNotAsk } }));
          // Replace, so the back gesture from Location needed goes to Home.
          navigate("/location-needed", { replace: true });
          return;
        }
        const { position } = outcome;
        // The denial is behind us now. Clearing it here, not in Ask again, keeps Location needed from sending the
        // user Home while the navigation to Working is still on its way.
        setState((current) => ({
          ...current,
          locationNeeded: null,
          steps: { ...current.steps, location: "done", responsibleParty: "current" },
        }));

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
    [navigate],
  );

  const startReport = useCallback(
    (file: File) => {
      releasePhoto();
      const url = URL.createObjectURL(file);
      photoUrlRef.current = url;
      setState({
        photo: { file, url },
        steps: { ...ALL_WAITING, photo: "current" },
        result: null,
        notice: null,
        locationNeeded: null,
      });
      navigate("/working");
      runSteps(file, "photo");
    },
    [navigate, releasePhoto, runSteps],
  );

  const photo = state.photo;
  const askAgain = useCallback(() => {
    if (!photo) return;
    setState((current) => ({
      ...current,
      steps: { photo: "done", location: "current", responsibleParty: "waiting" },
      result: null,
    }));
    // Replace, so the back gesture from Working goes to Home and not to the Location needed screen.
    navigate("/working", { replace: true });
    // The ask starts inside this tap, with no wait before it, so the prompt follows the user's own action.
    runSteps(photo.file, "location");
  }, [photo, navigate, runSteps]);

  const value = useMemo<FlowValue>(() => ({ ...state, startReport, askAgain }), [state, startReport, askAgain]);

  return (
    <FlowContext value={value}>
      <Outlet />
    </FlowContext>
  );
}
