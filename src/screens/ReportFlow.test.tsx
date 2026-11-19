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
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(lookup).mockReset();
  vi.mocked(lookup).mockResolvedValue(SAMPLE);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "geolocation");
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

  it("returns to Home with a message, and does not continue, when location is denied", async () => {
    const geo = stubGeolocation();
    const router = renderAt("/");
    takePhoto();
    await vi.waitFor(() => expect(geo.getCurrentPosition).toHaveBeenCalled());

    geo.fail(1); // PERMISSION_DENIED

    expect(await screen.findByRole("alert")).toHaveTextContent(NOTICES.locationDenied);
    expect(router.state.location.pathname).toBe("/");
    expect(screen.getByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(lookup).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
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
    geo.fail(1);
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

  it.each(["/working", "/result"])("sends a direct visit to %s with no photo back to Home", async (path) => {
    const router = renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });
});
