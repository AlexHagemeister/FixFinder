import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTICES } from "../flow/notices.ts";
import { reloadPage } from "../flow/reload.ts";
import { clearPhoto, loadPhoto, SAVED_PHOTO_MAX_AGE_MS, savePhoto, type SavedPhoto } from "../flow/saved-photo.ts";
import { reverseGeocode, type ReverseGeocode } from "../location/nominatim.ts";
import { lookup, type LookupResponse } from "../lookup/lookup.ts";
import { routes } from "../routes.tsx";

const mapEvents = vi.hoisted(() => ({
  moveEnd: () => {},
  tilesLoaded: () => {},
}));
vi.mock("leaflet", () => ({
  latLng: vi.fn(),
  map: () => ({
    setView() { return this; },
    on(event: string, callback: () => void) {
      if (event === "moveend") mapEvents.moveEnd = callback;
    },
    getCenter: () => ({ wrap: () => ({ lat: 37.87, lng: -122.27, distanceTo: () => 100 }) }),
    remove: vi.fn(),
  }),
  tileLayer: () => {
    const listeners = new Map<string, () => void>();
    mapEvents.tilesLoaded = () => {
      listeners.get("tileload")?.();
      listeners.get("load")?.();
    };
    return {
      on: (event: string, callback: () => void) => listeners.set(event, callback),
      addTo: vi.fn(),
    };
  },
}));

// The real lookup waits on purpose, and the step pacing holds each step on screen. Neither belongs in a test.
vi.mock("../lookup/lookup.ts", () => ({ lookup: vi.fn() }));
vi.mock("../flow/timing.ts", () => ({ STEP_MIN_MS: 0, FINISH_PAUSE_MS: 0 }));
// Place names come from Nominatim over the network, so tests answer for it.
vi.mock("../location/nominatim.ts", () => ({ reverseGeocode: vi.fn() }));
// jsdom has no IndexedDB and cannot reload a page, so the saved photo and the reload are stand-ins too.
vi.mock("../flow/saved-photo.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../flow/saved-photo.ts")>()),
  savePhoto: vi.fn(),
  loadPhoto: vi.fn(),
  clearPhoto: vi.fn(),
}));
vi.mock("../flow/reload.ts", () => ({ reloadPage: vi.fn() }));

const SAMPLE: LookupResponse = {
  category: "Pothole",
  description: "A hole in the road surface.",
  responsibleParty: "Berkeley Public Works",
  source: { name: "City of Berkeley, Street Repair page", url: "https://berkeleyca.gov/street-repair" },
  placeholder: true,
};

const BERKELEY = { latitude: 37.8716, longitude: -122.2727 };

// What Nominatim says about the position: a street address in Berkeley.
const SHATTUCK: ReverseGeocode = {
  name: "",
  category: "building",
  type: "yes",
  address: { house_number: "2160", road: "Shattuck Avenue", city: "Berkeley", postcode: "94704" },
  latitude: null,
  longitude: null,
};

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

// Renders the app at `path` and waits out app start's look for a saved photo, until a screen shows.
async function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  await screen.findByRole("main");
  return router;
}

function photoFile() {
  return new File(["photo bytes"], "pothole.jpg", { type: "image/jpeg" });
}

// Takes a photo on the screen showing now. A screen that just appeared can still have an effect waiting to run, and
// Home's effect ends any report in progress. Fired before it runs, the photo would start a report that the effect then
// ends, which no person can do: picking a photo takes far longer than the effect. Awaiting an empty act() first lets
// React run what it has queued, since act() yields one task behind it, so the photo arrives after Home has settled.
async function takePhoto() {
  await act(async () => {});
  const file = photoFile();
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(input).toHaveAttribute("accept", "image/*");
  expect(input).toHaveAttribute("capture", "environment");
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

// Picks a photo already on the phone through Home's Choose from your photos, settling React first as takePhoto does.
// `files` empty stands for backing out of the photo picker without choosing.
async function choosePhoto(files: File[] = [photoFile()]) {
  await act(async () => {});
  const input = document.querySelector<HTMLInputElement>('input[type="file"][data-source="library"]')!;
  expect(input).toHaveAttribute("accept", "image/*");
  expect(input).not.toHaveAttribute("capture");
  fireEvent.change(input, { target: { files } });
  return files[0];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(lookup).mockReset();
  vi.mocked(lookup).mockResolvedValue(SAMPLE);
  vi.mocked(reverseGeocode).mockReset();
  vi.mocked(reverseGeocode).mockResolvedValue(SHATTUCK);
  vi.mocked(savePhoto).mockReset();
  vi.mocked(savePhoto).mockResolvedValue(true);
  vi.mocked(loadPhoto).mockReset();
  vi.mocked(loadPhoto).mockResolvedValue(null);
  vi.mocked(clearPhoto).mockReset();
  vi.mocked(clearPhoto).mockResolvedValue(undefined);
  vi.mocked(reloadPage).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "geolocation");
  Reflect.deleteProperty(navigator, "permissions");
  Reflect.deleteProperty(navigator, "userAgent");
});

describe("Report flow", () => {
  it("keeps the old location on Back and names a confirmed pin without rerunning the lookup", async () => {
    // jsdom exposes the dialog element without implementing its modal methods.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
      close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
    });
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    geo.allow();
    const edit = await screen.findByRole("button", { name: "Change location" });

    fireEvent.click(edit);
    await screen.findByRole("dialog", { name: "Change location" });
    act(() => {
      mapEvents.tilesLoaded();
      mapEvents.moveEnd();
    });
    expect(reverseGeocode).toHaveBeenCalledTimes(1);
    await act(async () => { await router.navigate(-1); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("2160 Shattuck Avenue, Berkeley")).toBeInTheDocument();

    vi.mocked(reverseGeocode).mockResolvedValueOnce({
      ...SHATTUCK,
      address: { house_number: "2000", road: "Oxford Street", city: "Berkeley" },
    });
    fireEvent.click(edit);
    await screen.findByRole("dialog", { name: "Change location" });
    act(() => {
      mapEvents.tilesLoaded();
      mapEvents.moveEnd();
    });
    fireEvent.click(screen.getByRole("button", { name: "Use this location" }));
    expect(await screen.findByText("Your pick")).toBeInTheDocument();
    expect(screen.getByText("2000 Oxford Street, Berkeley")).toBeInTheDocument();
    expect(reverseGeocode).toHaveBeenLastCalledWith(37.87, -122.27);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("goes from Home to Working to Result, with the photo, category, responsible party, and source", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");

    const file = await takePhoto();

    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/working");
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
    expect(screen.getByText("Reading the photo")).toBeInTheDocument();
    expect(screen.getByText("Pinning down the location")).toBeInTheDocument();
    expect(screen.getByText("Finding who is responsible")).toBeInTheDocument();

    // Location is asked for after the photo, on the location step.
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    // The ask goes out in the same moment the step changes, so the screen can show it a moment after the ask.
    expect(await screen.findByText("Getting your location")).toBeInTheDocument();
    geo.allow();

    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/result");
    expect(lookup).toHaveBeenCalledWith({ photo: file, location: expect.objectContaining(BERKELEY) });

    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
    expect(screen.getByText("Pothole")).toBeInTheDocument();
    expect(screen.getByText("A hole in the road surface.")).toBeInTheDocument();
    expect(screen.getByText("Berkeley Public Works")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source: City of Berkeley, Street Repair page/ })).toHaveAttribute(
      "href",
      "https://berkeleyca.gov/street-repair",
    );
  });

  it("takes a photo chosen from the phone through Working to Result, the same as a taken one", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");

    const file = await choosePhoto();

    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    geo.allow();

    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/result");
    expect(lookup).toHaveBeenCalledWith({ photo: file, location: expect.objectContaining(BERKELEY) });
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
  });

  it("opens Location needed for a chosen photo when the user denies location", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");

    await choosePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    answerAfter(A_PERSON_ANSWERING_MS);
    geo.fail(1);

    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/location-needed"));
    expect(lookup).not.toHaveBeenCalled();
  });

  it("stays on Home with nothing changed when the user backs out of the photo picker", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");

    await choosePhoto([]);
    await act(async () => {});

    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("shows the location it found on Working once the location step is done", async () => {
    // The lookup never answers, so Working stays on screen with the location step done.
    vi.mocked(lookup).mockReturnValue(new Promise(() => {}));
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();

    expect(await screen.findByText("2160 Shattuck Avenue, Berkeley")).toBeInTheDocument();
    expect(reverseGeocode).toHaveBeenCalledWith(BERKELEY.latitude, BERKELEY.longitude);
  });

  it("shows the location on Result with OpenStreetMap's credit, and sends the location detail to the lookup", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    const file = await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();

    await screen.findByRole("heading", { name: "Here is what FixFinder found" });
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("2160 Shattuck Avenue, Berkeley")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /© OpenStreetMap contributors/ })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(lookup).toHaveBeenCalledWith({
      photo: file,
      location: {
        ...BERKELEY,
        accuracyMeters: null,
        address: SHATTUCK.address,
        landmarks: [],
      },
    });
  });

  it("carries on when it cannot put the location into words, and the lookup still gets the exact position", async () => {
    vi.mocked(reverseGeocode).mockRejectedValue(new TypeError("Failed to fetch"));
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();

    await screen.findByRole("heading", { name: "Here is what FixFinder found" });
    expect(screen.getByText(/couldn't put this location into words/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /OpenStreetMap/ })).not.toBeInTheDocument();
    expect(lookup).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { ...BERKELEY, accuracyMeters: null, address: null, landmarks: [] },
      }),
    );
  });

  it("labels the result as placeholder output", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();

    const note = await screen.findByRole("note", { name: "Placeholder result" });
    expect(note).toHaveTextContent("Placeholder result");
    expect(note).toHaveTextContent("sample output");
  });

  it("opens the camera from Result's Retake photo, and a new photo starts a new report", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    geo.allow();
    await screen.findByRole("heading", { name: "Here is what FixFinder found" });

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Retake photo" }));
    expect(click).toHaveBeenCalledTimes(1);
    // Closing the camera without a photo leaves Result in place.
    expect(router.state.location.pathname).toBe("/result");

    const retake = new File(["new photo"], "retake.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [retake] } });
    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2));
    geo.allow();
    await screen.findByRole("heading", { name: "Here is what FixFinder found" });
    expect(vi.mocked(lookup).mock.calls[1]![0].photo).toBe(retake);
  });

  it("returns to Home with a message when location times out", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());

    geo.fail(3); // TIMEOUT

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationFailed);
    expect(router.state.location.pathname).toBe("/");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("clears the message when the user leaves Home for another tab, so it does not come back", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.fail(3); // TIMEOUT
    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationFailed);

    const tabBar = screen.getByRole("navigation", { name: "Main" });
    fireEvent.click(within(tabBar).getByRole("link", { name: "My reports" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My reports" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Home" }));

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("returns to Home with a message when the browser has no location support", async () => {
    await renderAt("/");
    await takePhoto();

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationUnsupported);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("clears the message when the user takes another photo", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    geo.fail(3); // TIMEOUT. A denial no longer shows a message on Home.
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await takePhoto();

    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("stops the run when the user cancels, and never opens Result", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("heading", { name: "See something broken?" })).toBeInTheDocument();

    geo.allow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.state.location.pathname).toBe("/");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("hides the tab bar from the photo through Result, and brings it back on Done", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

    await takePhoto();
    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    geo.allow();
    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("heading", { name: "See something broken?" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("brings the tab bar back when the user cancels", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("heading", { name: "See something broken?" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it.each(["/working", "/location-needed", "/result"])("sends a direct visit to %s with no photo back to Home", async (path) => {
    const router = await renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("Location needed", () => {
  // Takes a photo and denies the first ask for location, answering after `ms`.
  async function takePhotoAndDeny(geo: ReturnType<typeof stubGeolocation>, ms: number) {
    const file = await takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
    answerAfter(ms);
    geo.fail(1); // PERMISSION_DENIED
    await screen.findByRole("heading", { level: 1, name: "FixFinder needs your location" });
    return file;
  }

  it("opens when location is denied, says why, and does not continue", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    expect(router.state.location.pathname).toBe("/location-needed");
    expect(screen.getByText(/Without your location, FixFinder cannot find the responsible party/)).toBeInTheDocument();
    expect(screen.getByText(/so it stops here/)).toBeInTheDocument();
    expect(screen.getByText(/Tap Ask again, then choose Allow when your phone asks/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Steps to turn location on" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask again" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Not now" })).toBeEnabled();
    // A first denial does not say location is "still" off.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // It stays put: no lookup, no Result, and the photo is kept for Ask again.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.state.location.pathname).toBe("/location-needed");
    expect(lookup).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("saves the photo when it opens, in case the phone closes FixFinder", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    const file = await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    expect(savePhoto).toHaveBeenCalledWith(file, { phoneWillNotAsk: false, resumeAtLocation: false });
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("saves the photo marked to resume at the location step, then reloads, when the user taps Ask again", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    const file = await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));

    await vi.waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(savePhoto).toHaveBeenLastCalledWith(file, { phoneWillNotAsk: false, resumeAtLocation: true });
    // The ask happens after the reload, not on this page.
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/location-needed");

    // A second tap while the first is still on its way does nothing more.
    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it("carries on with the same photo to Working and Result when the photo cannot be saved and Ask again succeeds", async () => {
    vi.mocked(savePhoto).mockResolvedValue(false); // No IndexedDB, as in private mode: the report stays in memory.
    const geo = stubGeolocation();
    const router = await renderAt("/");
    const file = await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));

    // Back on Working, at the location step: the photo step is already done.
    expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/working");
    expect(screen.getByText("Photo ready")).toBeInTheDocument();
    expect(screen.getByText("Getting your location")).toBeInTheDocument();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2));
    expect(reloadPage).not.toHaveBeenCalled();
    answerAfter(A_PERSON_ANSWERING_MS);
    geo.allow();

    expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/result");
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(vi.mocked(lookup).mock.calls[0]![0].photo).toBe(file);
    expect(lookup).toHaveBeenCalledWith({ photo: file, location: expect.objectContaining(BERKELEY) });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole("img", { name: "Your photo" })).toHaveAttribute("src", "blob:photo");
  });

  it("shows the steps for turning location on when a second denial comes back instantly, without a saved photo", async () => {
    vi.mocked(savePhoto).mockResolvedValue(false);
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);
    expect(screen.queryByRole("list", { name: "Steps to turn location on" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
    await screen.findByRole("heading", { name: "Working on your report" });
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2));
    geo.fail(1); // The phone denies on its own, with no time for a person to answer.

    const steps = await screen.findByRole("list", { name: "Steps to turn location on" });
    expect(router.state.location.pathname).toBe("/location-needed");
    expect(screen.getByText(/If your phone does not ask, turn location on in its settings/)).toBeInTheDocument();
    // jsdom is no known phone, so it gets the prototype's general wording.
    expect(steps).toHaveTextContent("Turn on location for this site in your browser settings.");
    expect(steps).toHaveTextContent("Come back to FixFinder and tap Ask again.");
    expect(screen.getByRole("alert")).toHaveTextContent("Location is still off for FixFinder.");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("shows the Android Chrome steps on Android Chrome", async () => {
    Object.defineProperty(navigator, "userAgent", { value: ANDROID_CHROME, configurable: true });
    const geo = stubGeolocation();
    await renderAt("/");
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
    await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
    expect(screen.getByRole("list", { name: "Steps to turn location on" })).toHaveTextContent("Come back to FixFinder and tap Ask again.");
  });

  it("has no tab bar, and Not now brings it back on Home", async () => {
    const geo = stubGeolocation();
    await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("goes to Home and ends the report when the user taps Not now", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);
    vi.mocked(clearPhoto).mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(clearPhoto).toHaveBeenCalledTimes(1);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("goes to Home on the back gesture", async () => {
    const geo = stubGeolocation();
    const router = await renderAt("/");
    await takePhotoAndDeny(geo, A_PERSON_ANSWERING_MS);

    await router.navigate(-1);

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("App start with a saved photo", () => {
  function saved(overrides: Partial<SavedPhoto> = {}): SavedPhoto {
    return { photo: photoFile(), savedAt: Date.now(), phoneWillNotAsk: true, resumeAtLocation: true, ...overrides };
  }

  // "/location-needed" is Ask again's reload in place. "/" is a home-screen app opening at its start page.
  it.each(["/location-needed", "/"])(
    "after Ask again's reload at %s, runs the location step with the saved photo through Working to Result",
    async (path) => {
      const record = saved();
      vi.mocked(loadPhoto).mockResolvedValue(record);
      const geo = stubGeolocation();
      const router = await renderAt(path);

      expect(await screen.findByRole("heading", { name: "Working on your report" })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/working");
      expect(screen.getByText("Photo ready")).toBeInTheDocument();
      expect(screen.getByText("Getting your location")).toBeInTheDocument();
      // The resume is used up, so another reload before the step ends opens Location needed instead.
      expect(savePhoto).toHaveBeenCalledWith(record.photo, { phoneWillNotAsk: true, resumeAtLocation: false });

      await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));
      vi.mocked(clearPhoto).mockClear();
      answerAfter(A_PERSON_ANSWERING_MS);
      geo.allow();

      expect(await screen.findByRole("heading", { name: "Here is what FixFinder found" })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe("/result");
      expect(lookup).toHaveBeenCalledWith({ photo: record.photo, location: expect.objectContaining(BERKELEY) });
      // The finished report no longer needs a saved photo.
      expect(clearPhoto).toHaveBeenCalledTimes(1);
    },
  );

  it("says location is still off when the location step after the reload is denied again", async () => {
    vi.mocked(loadPhoto).mockResolvedValue(saved());
    const geo = stubGeolocation();
    const router = await renderAt("/location-needed");
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1));

    geo.fail(1); // Location is still blocked for the site.

    expect(await screen.findByRole("alert")).toHaveTextContent("Location is still off for FixFinder.");
    expect(router.state.location.pathname).toBe("/location-needed");
    expect(screen.getByRole("heading", { level: 1, name: "FixFinder needs your location" })).toBeInTheDocument();
    // The steps for turning location on stay.
    expect(screen.getByRole("list", { name: "Steps to turn location on" })).toHaveTextContent(
      "Come back to FixFinder and tap Ask again.",
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("goes back to Location needed with the photo when the app was closed and opened again", async () => {
    vi.mocked(loadPhoto).mockResolvedValue(saved({ resumeAtLocation: false }));
    const geo = stubGeolocation();
    const router = await renderAt("/");

    expect(await screen.findByRole("heading", { level: 1, name: "FixFinder needs your location" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/location-needed");
    // The saved answer to "will the phone ask again" brings back the same steps.
    expect(screen.getByRole("list", { name: "Steps to turn location on" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(clearPhoto).not.toHaveBeenCalled();

    // Ask again from here saves and reloads as usual.
    fireEvent.click(screen.getByRole("button", { name: "Ask again" }));
    await vi.waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(savePhoto).toHaveBeenLastCalledWith(expect.any(File), { phoneWillNotAsk: true, resumeAtLocation: true });
  });

  it("removes a stale saved photo and starts on Home", async () => {
    vi.mocked(loadPhoto).mockResolvedValue(saved({ savedAt: Date.now() - SAVED_PHOTO_MAX_AGE_MS - 1 }));
    const geo = stubGeolocation();
    const router = await renderAt("/location-needed");

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(clearPhoto).toHaveBeenCalled();
    expect(geo.getCurrentPosition).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
