import { NavLink, Outlet } from "react-router";
import { TabHomeIcon, TabReportsIcon, TabSettingsIcon } from "../icons.tsx";

// The tab bar's three tabs, in the core-app prototype's order (design/prototypes/core-app.html).
const TABS = [
  { to: "/", label: "Home", Icon: TabHomeIcon },
  { to: "/reports", label: "My reports", Icon: TabReportsIcon },
  { to: "/settings", label: "Settings", Icon: TabSettingsIcon },
];

// Tab bar: moves between the main screens. NavLink marks the current tab with aria-current="page", which the styles
// show too, so the user can see where they are (Nielsen 1). The tabs sit at the bottom edge, full width and 56 px
// tall, so they are big, close targets for a thumb (Fitts's law).
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ to, label, Icon }) => (
        // `end` keeps Home from counting as current on every other tab, since every path starts with "/".
        <NavLink key={to} to={to} end className="tab">
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// Lays out a main screen above the tab bar. Only Home, My reports, and Settings sit inside it, so the report flow's
// screens (Working, Location needed, Result) have no tab bar: a tap on a tab cannot drop a report in progress.
// Finishing or cancelling a report lands on Home, which brings the bar back.
export function TabScreens() {
  return (
    <div className="tabbed">
      <Outlet />
      <TabBar />
    </div>
  );
}
