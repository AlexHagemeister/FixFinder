// Works out whether the phone will show its location prompt again after a denial.
//
// After the user denies location once, iPhone Safari, iPhone home-screen apps, and Chrome on Android often deny every
// later ask on their own, without showing the prompt. Then Ask again cannot help, and only the phone's settings can
// turn location back on. Neither signal below is certain, so the screen words its steps as "if your phone does not ask".

/**
 * A denial that arrives faster than this came from the phone, not from the user. Reading the prompt and tapping
 * Don't Allow takes well over a simple reaction's 240 ms (Model Human Processor), so a person needs about a second.
 */
export const INSTANT_DENIAL_MS = 1000;

/** The Permissions API's answer for location, or null where the browser lacks it or refuses to say. */
async function permissionState(): Promise<PermissionState | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return null;
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return null;
  }
}

/**
 * True when the phone will likely not ask again. `answeredInMs` is how long the denied ask took.
 * The Permissions API counts one way only: "denied" means the prompt is blocked, while "prompt" proves nothing,
 * because Safari can report it and still deny on its own.
 */
export async function phoneWillNotAskAgain(answeredInMs: number): Promise<boolean> {
  if (answeredInMs < INSTANT_DENIAL_MS) return true;
  return (await permissionState()) === "denied";
}
