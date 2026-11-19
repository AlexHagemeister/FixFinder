import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform.ts";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_HOME_SCREEN =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const ANDROID_SAMSUNG =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36";
const ANDROID_WEB_VIEW =
  "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("detectPlatform", () => {
  it.each([
    ["iPhone Safari", IPHONE_SAFARI, false, "iphoneSafari"],
    ["an iPhone home-screen app", IPHONE_HOME_SCREEN, true, "iphoneHomeScreen"],
    ["Chrome on iPhone", IPHONE_CHROME, false, "other"],
    ["Chrome on Android", ANDROID_CHROME, false, "androidChrome"],
    ["an installed app on Android", ANDROID_CHROME, true, "other"],
    ["Samsung Internet", ANDROID_SAMSUNG, false, "other"],
    ["an Android web view", ANDROID_WEB_VIEW, false, "other"],
    ["Safari on a Mac", MAC_SAFARI, false, "other"],
  ] as const)("reads %s", (_name, userAgent, homeScreenApp, expected) => {
    expect(detectPlatform(userAgent, homeScreenApp)).toBe(expected);
  });
});
