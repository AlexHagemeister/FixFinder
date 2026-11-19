// Pacing for the Working screen. These hold a finished step on screen long enough to read. They never stand in for work.
// Tests replace this module with zeros.

/** The shortest time each step shows as in progress, even when its work finishes sooner. */
export const STEP_MIN_MS = 500;

/** How long the finished steps stay on screen before the Result screen opens. */
export const FINISH_PAUSE_MS = 800;
