// Tells the launcher when it has left the screen and when it's back.
// TVs don't report this reliably in one way, so three signals feed the same two callbacks.
const BEAT_MS = 5000;
// Timers stop while the TV is off or the launcher is frozen behind an app, so a long gap means we were away.
const GAP_MS = 15000;

export const watchPresence = (browser: Window, handlers: { onAway(): void; onReturn(awayMs: number): void }) => {
  const { document } = browser;
  let away = document.hidden;
  let since = 0;
  let lastBeat = Date.now();

  const leave = (at = Date.now()) => {
    if (!away) {
      away = true;
      since = at;
      handlers.onAway();
    }
  };
  const back = () => {
    if (away) {
      away = false;
      handlers.onReturn(Date.now() - since);
    }
  };
  const visibility = () => {
    if (document.hidden) {
      leave();
    } else {
      back();
    }
  };
  const blur = () => leave();
  const beat = () => {
    const now = Date.now();
    const gap = now - lastBeat;
    lastBeat = now;
    if (gap > GAP_MS && !document.hidden) {
      leave(now - gap);
      back();
    }
  };
  document.addEventListener("visibilitychange", visibility);
  // A TV app that takes the screen doesn't always report the launcher as hidden, but it does take focus.
  // A desktop browser's focus changes say nothing about the TV, so the preview ignores them.
  const onTv = "tizen" in browser;
  if (onTv) {
    browser.addEventListener("blur", blur);
    browser.addEventListener("focus", back);
  }
  const timer = browser.setInterval(beat, BEAT_MS);
  return () => {
    browser.clearInterval(timer);
    document.removeEventListener("visibilitychange", visibility);
    if (onTv) {
      browser.removeEventListener("blur", blur);
      browser.removeEventListener("focus", back);
    }
  };
};
