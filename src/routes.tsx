import type { RouteObject } from "react-router";
import { Home } from "./screens/Home.tsx";

// One entry per screen. Later screens (camera, working, result) slot in here.
export const routes: RouteObject[] = [{ path: "/", element: <Home /> }];
