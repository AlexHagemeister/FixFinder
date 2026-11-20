import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { routes } from "../routes.tsx";

// Renders the app at `path` and waits out app start's look for a saved photo (none here: jsdom has no IndexedDB).
async function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  await screen.findByRole("main");
  return router;
}

const tabBar = () => screen.getByRole("navigation", { name: "Main" });
const tab = (name: string) => within(tabBar()).getByRole("link", { name });

describe("Tab bar", () => {
  it("shows Home, My reports, and Settings on Home, with Home marked as current", async () => {
    await renderAt("/");

    const names = within(tabBar())
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(names).toEqual(["Home", "My reports", "Settings"]);
    expect(tab("Home")).toHaveAttribute("aria-current", "page");
    expect(tab("My reports")).not.toHaveAttribute("aria-current");
    expect(tab("Settings")).not.toHaveAttribute("aria-current");
  });

  it("opens each tab's screen when tapped, and marks that tab as current", async () => {
    const router = await renderAt("/");

    fireEvent.click(tab("My reports"));
    expect(await screen.findByRole("heading", { level: 1, name: "My reports" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/reports");
    expect(tab("My reports")).toHaveAttribute("aria-current", "page");
    expect(tab("Home")).not.toHaveAttribute("aria-current");

    fireEvent.click(tab("Settings"));
    expect(await screen.findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/settings");
    expect(tab("Settings")).toHaveAttribute("aria-current", "page");

    fireEvent.click(tab("Home"));
    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(tab("Home")).toHaveAttribute("aria-current", "page");
  });
});

describe("Placeholder screens", () => {
  it("My reports says it is a placeholder and shows sample reports with their report status", async () => {
    await renderAt("/reports");

    const note = screen.getByRole("note", { name: "Placeholder screen" });
    expect(within(note).getByText("Placeholder screen")).toBeInTheDocument();
    expect(note).toHaveTextContent("still to be built");

    const reports = within(screen.getByRole("list", { name: "Sample reports" })).getAllByRole("listitem");
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0]).toHaveTextContent("Broken streetlight");
    expect(within(reports[0]).getByText("Report status: Received")).toBeInTheDocument();
  });

  it("Settings says it is a placeholder and shows sample rows that are not controls", async () => {
    await renderAt("/settings");

    const note = screen.getByRole("note", { name: "Placeholder screen" });
    expect(note).toHaveTextContent("they do nothing");

    const settings = screen.getByLabelText("Sample settings");
    expect(settings).toHaveTextContent("Reports are sent from");
    expect(settings).toHaveTextContent("Location");
    expect(settings).toHaveTextContent("Appearance");
    // The only controls are the tab bar's tabs: a sample row that looked tappable would be a false signifier.
    expect(within(screen.getByRole("main")).queryAllByRole("button")).toHaveLength(0);
    expect(within(screen.getByRole("main")).queryAllByRole("link")).toHaveLength(0);
  });
});
