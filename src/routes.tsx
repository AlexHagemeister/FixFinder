import type { RouteObject } from "react-router";
import { ReportFlow } from "./flow/ReportFlow.tsx";
import { Home } from "./screens/Home.tsx";
import { LocationNeeded } from "./screens/LocationNeeded.tsx";
import { Result } from "./screens/Result.tsx";
import { Working } from "./screens/Working.tsx";

// One entry per screen. ReportFlow wraps them all and holds the report in progress.
export const routes: RouteObject[] = [
  {
    element: <ReportFlow />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/working", element: <Working /> },
      { path: "/location-needed", element: <LocationNeeded /> },
      { path: "/result", element: <Result /> },
    ],
  },
];
