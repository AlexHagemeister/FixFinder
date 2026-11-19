// Which phone and browser FixFinder is running in, so the Location needed screen shows the settings steps for it.

/** The platforms with their own steps. Any other phone or browser gets general wording. */
export type SettingsPlatform = "iphoneSafari" | "iphoneHomeScreen" | "androidChrome" | "other";

/** True when FixFinder was launched from the home screen instead of a browser tab. */
export function isHomeScreenApp(): boolean {
  if (typeof window === "undefined") return false;
  // iPhone sets navigator.standalone. Other browsers report the manifest's display mode.
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function detectPlatform(userAgent: string, homeScreenApp: boolean): SettingsPlatform {
  if (/iPhone/.test(userAgent)) {
    // A home-screen app's user agent has no "Safari/" part, so check that mode first.
    if (homeScreenApp) return "iphoneHomeScreen";
    // Chrome, Firefox, Edge, and Opera on iPhone, and apps' built-in browsers, keep their own settings.
    if (/Safari\//.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)) return "iphoneSafari";
    return "other";
  }
  // An installed Android app has no address bar, so the Chrome steps cannot be followed from it.
  if (/Android/.test(userAgent) && !homeScreenApp && /Chrome\/\d/.test(userAgent)) {
    // Samsung Internet, Edge, Opera, Firefox, Yandex, and in-app web views all claim Chrome too.
    if (/SamsungBrowser|EdgA|OPR|Firefox|YaBrowser|; wv\)/.test(userAgent)) return "other";
    return "androidChrome";
  }
  return "other";
}
