import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { registerSW } from "virtual:pwa-register";
import { routes } from "./routes.tsx";
// Fonts are bundled with the app, so it makes no third-party requests. Latin subset, only the weights styles.css uses.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/space-grotesk/latin-700.css";
import "./styles.css";

// Registers the service worker as soon as the page loads, instead of after the window's load event. When a new build
// takes over, the plugin's autoUpdate mode reloads the page, so a phone shows the new build on the first open after a
// deploy. A report on the Location needed screen survives that reload through its saved photo.
registerSW({ immediate: true });

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
