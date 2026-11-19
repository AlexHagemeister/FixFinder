import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTICES } from "../flow/notices.ts";
import { lookup, type LookupResponse } from "../lookup/lookup.ts";
import { routes } from "../routes.tsx";

// The real lookup waits on purpose, and the step pacing holds each step on screen. Neither belongs in a test.
vi.mock("../lookup/lookup.ts", () => ({ lookup: vi.fn() }));
vi.mock("../flow/timing.ts", () => ({ STEP_MIN_MS: 0, FINISH_PAUSE_MS: 0 }));

const SAMPLE: LookupResponse = {
  category: "Pothole",
  description: "A hole in the road surface.",
  responsibleParty: "Berkeley Public Works",
  source: { name: "City of Berkeley, Street Repair page", url: "https://berkeleyca.gov/street-repair" },
  placeholder: true,
};

const BERKELEY = { latitude: 37.8716, longitude: -122.2727 };

type Success = (position: { coords: { latitude: number; longitude: number } }) => void;
type Failure = (error: { code: number; message: string }) => void;

// Stands in for navigator.geolocation. Each call waits until the test answers it.
function stubGeolocation() {
  const pending: { success: Success; failure: Failure }[] = [];
  const getCurrentPosition = vi.fn((success: Success, failure: Failure) => pending.push({ success, failure }));
  Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
  return {
    getCurrentPosition,
    allow: () => pending.shift()!.success({ coords: BERKELEY }),
    fail: (code: number) => pending.shift()!.failure({ code, message: "" }),
  };
}

// The geolocation stub answers within milliseconds, which reads as the phone denying on its own. Tests that need a
// person's answer move the clock forward first. Only Date is faked, so timers and promises run as usual.
function answerAfter(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

const A_PERSON_ANSWERING_MS = 3000;

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

function takePhoto() {
  const file = new File(["photo bytes"], "pothole.jpg", { type: "image/jpeg" });
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(input).toHaveAttribute("accept", "image/*");
  expect(input).toHaveAttribute("capture", "environment");
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(lookup).mockReset();
  vi.mocked(lookup).mockResolvedValue(SAMPLE);
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "geolocation");
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "userAgent");
});

describe("Report flow", () => {
  it("goes from Home to Working to Result, with the photo, category, responsible party, and source", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");

    const file = takePhoto();

    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/working");
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
    expect(screen.getByText("Reading the photo")).toBeInTheDocument();
    expect(screen.getByText("Pinning down the location")).toBeInTheDocument();
    expect(screen.getByText("Finding who is responsible")).toBeInTheDocument();

    // Location is asked for after the photo, on the location step.
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Asking your phone where you are")).toBeInTheDocument();
    geo.allow();

    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/result");
    expect(lookup).toHaveBeenCalledWith({ photo: file, ...BERKELEY });

    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.getByText("A hole in the road surface.")).toBeInTheDocument();
    expect(screen.getByText("Berkeley Public Works")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source: City of Berkeley, Street Repair page/ })).toHaveAttribute(
      "href",
      "https://berkeleyca.gov/street-repair",
    );
  });

  it("labels the result as placeholder output", async () => {
    const geo = stubGeolocation();
    renderAt("/");
    takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();

    const note = await screen.findByRole("note", { name: "Placeholder result" });
    expect(note).toHaveTextContent("Placeholder result");
    expect(note).toHaveTextContent("sample output");
  });

  it("returns to Home with a message when location times out", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());

    geo.fail(3); // TIMEOUT

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationFailed);
    expect(router.state.location.pathname).toBe("/");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns to Home with a message when the browser has no location support", async () => {
    renderAt("/");
    takePhoto();

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationUnsupported);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("clears the message when the user takes another photo", async () => {
    const geo = stubGeolocation();
    renderAt("/");
    takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    geo.fail(3); // TIMEOUT. A denial no longer shows a message on Home.
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    takePhoto();

    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops the run when the user cancels, and never opens Result", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("heading", { name: "See something broken?" })).toBeInTheDocument();

    geo.allow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.state.location.pathname).toBe("/");
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each(["/working", "/location-needed", "/result"])("sends a direct visit to %s with no photo back to Home", async (path) => {
    const router = renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("Location needed", () => {
  // Takes a photo and denies the first ask for location, answering after `ms`.
  async function takePhotoAndDeny(geo: ReturnType<typeof stubGeolocation>, ms: number) {
    const file = takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    answerAfter(ms);
    geo.fail(1); // PERMISSION_DENIED
    await screen.findByRole("heading", { level: 1, name: "FixFinder needs your location" });
    return file;
  }

  it("opens when location is denied, says why, and does not continue", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    expect(router.state.location.pathname).toBe("/location-needed");
    expect(screen.getByText(/Without your location, FixFinder cannot find the responsible party/)).toBeInTheDocument();
    expect(screen.getByText(/so it stops here/)).toBeInTheDocument();
    expect(screen.getByText(/Tap Ask again, then choose Allow when your phone asks/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Steps to turn location on" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Not now" })).toBeEnabled();

    // It stays put: no lookup, no Result, and the photo is kept for Ask again.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.state.location.pathname).toBe("/location-needed");
    expect(lookup).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("carries on with the same photo to Working and Result when Ask again succeeds", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    const file = await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));

    // Back on Working, at the location step: the photo step is already done.
    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/working");
    expect(screen.getByText("Photo ready")).toBeInTheDocument();
    expect(screen.getByText("Asking your phone where you are")).toBeInTheDocument();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    answerAfter(A_PERSON_ANSWERING_MS);
    geo.allow();

    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/result");
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(lookup).mock.calls[0]![0].photo).toBe(file);
    expect(lookup).toHaveBeenCalledWith({ photo: file, ...BERKELEY });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
  });

  it("shows the steps for turning location on when a second denial comes back instantly", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);
    expect(screen.queryByRole("list", { name: "Steps to turn location on" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
    await screen.findByRole("heading", { name: "Working on your report" });
    geo.fail(1); // The phone denies on its own, with no time for a person to answer.

    const steps = await screen.findByRole("list", { name: "Steps to turn location on" });
    expect(router.state.location.pathname).toBe("/location-needed");
    expect(screen.getByText(/If your phone does not ask, turn location on in its settings/)).toBeInTheDocument();
    // jsdom is no known phone, so it gets the prototype's general wording.
    expect(steps).toHaveTextContent("Turn on location for this site in your browser settings.");
    expect(steps).toHaveTextContent("Come back to FixFinder and tap Ask again.");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("shows the Android Chrome steps on Android Chrome", async () => {
    Object.defineProperty(navigator, "userAgent", { value: ANDROID_CHROME, configurable: true });
    const geo = stubGeolocation();
    renderAt("/");
    await takePhotoAndDeny(geo, 0); // Denied before any prompt, as when the site is already blocked.

    const steps = screen.getByRole("list", { name: "Steps to turn location on" });
    expect(steps).toHaveTextContent("Open the Settings app, tap Location, and turn on Use location.");
    expect(steps).toHaveTextContent("then Site controls, then Permissions.");
    expect(steps).toHaveTextContent("Tap Location and change it so FixFinder can use your location.");
  });

  it("shows the steps when the browser reports location as blocked, even after a slow answer", async () => {
    const query = vi.fn(async () => ({ state: "denied" }));
    Object.defineProperty(navigator, "permissions", { value: { query }, configurable: true });
    const geo = stubGeolocation();
    renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
    expect(screen.getByRole("list", { name: "Steps to turn location on" })).toHaveTextContent("Come back to FixFinder and tap Ask again.");
  });

  it("goes to Home and ends the report when the user taps Not now", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("goes to Home on the back gesture", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    await router.navigate(-1);

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});
