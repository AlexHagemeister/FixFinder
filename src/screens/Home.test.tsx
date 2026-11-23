import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../routes.tsx";

async function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(<RouterProvider router={router} />);
  // App start first looks for a saved photo (none here: jsdom has no IndexedDB), so Home appears a moment later.
  await screen.findByRole("heading", { level: 1, name: "See something broken?" });
  return router;
}

describe("Home", () => {
  it('renders at "/" with its title and the Take a photo button', async () => {
    await renderHome();

    expect(screen.getByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo" })).toBeEnabled();
  });

  it("offers Choose from your photos below Take a photo, as the quieter button", async () => {
    await renderHome();

    const take = screen.getByRole("button", { name: "Take a photo" });
    const choose = screen.getByRole("button", { name: "Choose from your photos" });
    expect(take).toHaveClass("btn", "primary");
    expect(choose).toHaveClass("btn", "text");
    expect(choose).not.toHaveClass("primary");
    expect(take.compareDocumentPosition(choose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("opens the camera from Take a photo and the photo picker from Choose from your photos", async () => {
    await renderHome();
    const clicked: HTMLInputElement[] = [];
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) {
      clicked.push(this);
    });

    fireEvent.click(screen.getByRole("button", { name: "Take a photo" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose from your photos" }));
    click.mockRestore();

    expect(clicked).toHaveLength(2);
    const [camera, library] = clicked;
    expect(camera).toHaveAttribute("accept", "image/*");
    expect(camera).toHaveAttribute("capture", "environment");
    expect(library).toHaveAttribute("accept", "image/*");
    expect(library).not.toHaveAttribute("capture");
  });

  it("marks its sample sections as placeholders", async () => {
    await renderHome();

    expect(screen.getByRole("note", { name: "Placeholder" })).toHaveTextContent("still to be decided");
    for (const name of ["Your latest report", "Problems near you", "Is this still there?"]) {
      const section = screen.getByRole("region", { name });
      expect(within(section).getByRole("heading", { level: 2, name })).toBeInTheDocument();
      expect(within(section).getByText("Sample")).toBeInTheDocument();
    }
  });

  it("opens My reports from See all your reports", async () => {
    const router = await renderHome();

    fireEvent.click(screen.getByRole("link", { name: "See all your reports" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My reports" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/reports");
  });

  it("answers a tap on the sample Follow and Still there buttons", async () => {
    await renderHome();

    const follow = screen.getByRole("button", { name: "Follow Pothole" });
    expect(follow).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(follow);
    expect(screen.getByRole("button", { name: "Following Pothole" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Still there" }));
    expect(screen.getByRole("status")).toHaveTextContent("Thanks for checking. You said: still there. (Sample: nothing was saved.)");
    expect(screen.queryByRole("button", { name: "It is gone" })).not.toBeInTheDocument();
  });
});
