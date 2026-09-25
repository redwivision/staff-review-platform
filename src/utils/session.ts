// Session lifetime guard.
//
// The app must not drop a user back into the middle of a review after they
// have been away. Two conditions send them back to the login screen instead:
//
//   1. The browser was closed, the machine restarted, or the tab was reopened
//      in a fresh session. sessionStorage dies with the browser session, so a
//      missing marker means "this is not the same sitting".
//   2. The last recorded activity is older than IDLE_LIMIT_MS, which covers a
//      tab left open overnight.
//
// Both are evaluated on boot only. While the tab stays open the app keeps
// working; it is resuming that requires a fresh sign-in.

const SESSION_MARKER_KEY = "staff_review_session_marker";
const LAST_ACTIVITY_KEY = "staff_review_last_activity";

// Eight hours: a working day. Long enough that a coffee break or a meeting
// does not sign anyone out, short enough that reopening the app the next
// morning starts clean.
const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;

// localStorage writes are throttled to once a minute so that mousemove-driven
// events cannot hammer storage.
const STAMP_THROTTLE_MS = 60 * 1000;

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Private browsing or a full quota. Losing the timestamp only makes the
    // guard fall back to the browser-session check, which is the safer
    // direction anyway.
  }
}

function safeRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Records that the user is present. Throttled; safe to call on every event. */
export function markSessionActive(force = false): void {
  const now = Date.now();
  if (!force) {
    const last = Number(safeGet(localStorage, LAST_ACTIVITY_KEY) || 0);
    if (now - last < STAMP_THROTTLE_MS) return;
  }
  safeSet(localStorage, LAST_ACTIVITY_KEY, String(now));
}

/** Marks this browser session as the live one. */
export function markSessionLive(): void {
  safeSet(sessionStorage, SESSION_MARKER_KEY, String(Date.now()));
  markSessionActive(true);
}

/**
 * True when the stored session must not be resumed, i.e. the user needs to
 * sign in again.
 */
export function shouldRequireLogin(): boolean {
  const marker = safeGet(sessionStorage, SESSION_MARKER_KEY);
  if (!marker) return true;

  const last = Number(safeGet(localStorage, LAST_ACTIVITY_KEY) || 0);
  if (!last) return true;
  if (Date.now() - last > IDLE_LIMIT_MS) return true;

  return false;
}

/** Drops the liveness markers so the next boot starts at the login screen. */
export function clearSessionMarkers(): void {
  safeRemove(sessionStorage, SESSION_MARKER_KEY);
  safeRemove(localStorage, LAST_ACTIVITY_KEY);
}

/**
 * Keeps the activity timestamp fresh while the tab is in use. Returns a
 * cleanup function.
 */
export function startActivityTracking(): () => void {
  const onActivity = () => markSessionActive();

  window.addEventListener("pointerdown", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity);
  window.addEventListener("focus", onActivity);

  // A tab restored from the browser's back/forward cache, or a phone waking
  // from sleep, resumes without firing the events above.
  const onVisibility = () => {
    if (document.visibilityState === "visible") markSessionActive();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener("pointerdown", onActivity);
    window.removeEventListener("keydown", onActivity);
    window.removeEventListener("focus", onActivity);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
