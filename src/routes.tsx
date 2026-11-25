import type { RouteObject } from "react-router";
import { ReportFlow } from "./flow/ReportFlow.tsx";
import { DescribeYourself } from "./screens/DescribeYourself.tsx";
import { Home } from "./screens/Home.tsx";
import { LocationNeeded } from "./screens/LocationNeeded.tsx";
import { MyReports } from "./screens/MyReports.tsx";
import { Result } from "./screens/Result.tsx";
import { Settings } from "./screens/Settings.tsx";
import { TabScreens } from "./screens/TabBar.tsx";
import { Working } from "./screens/Working.tsx";

// One entry per screen. ReportFlow wraps them all and holds the report in progress. The main screens sit inside
// TabScreens, which adds the tab bar. The report flow's screens sit outside it, so the tab bar hides during a report.
export const routes: RouteObject[] = [
  {
    element: <ReportFlow />,
    children: [
      {
        element: <TabScreens />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/reports", element: <MyReports /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
      { path: "/working", element: <Working /> },
      { path: "/describe", element: <DescribeYourself /> },
      { path: "/location-needed", element: <LocationNeeded /> },
      { path: "/result", element: <Result /> },
    ],
  },
];
