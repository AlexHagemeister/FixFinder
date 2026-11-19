import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { routes } from "../routes.tsx";

describe("Home", () => {
  it('renders at "/" with its title and the Take a photo button', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);

    // App start first looks for a saved photo (none here: jsdom has no IndexedDB), so Home appears a moment later.
    expect(await screen.findByRole("heading", { level: 1, name: "See something broken?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a photo" })).toBeEnabled();
  });
});
