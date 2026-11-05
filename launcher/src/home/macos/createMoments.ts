import type { MessageKey } from "../../shared/i18n/catalogues";
import { watchPresence } from "../../shared/presence/watchPresence";
import { createStore } from "../../shared/state/createStore";

import type { Mood } from "./conversation";
import { answerFor } from "./conversation";

export interface Conversation {
  readonly answer: MessageKey | null;
  readonly back: string | null;
  readonly turn: number;
}

const WELCOME_MS = 30000;
// A launch that never left the launcher failed, so it must not count as "back from an app" later.
const LAUNCH_EXPIRY_MS = 15000;
// Brief screen changes aren't a new session. Very long gaps count as turning the TV on again.
const MIN_AWAY_MS = 60000;
const LONG_AWAY_MS = 4 * 60 * 60 * 1000;

// Keeps the greeting's conversation going: a fresh question at power-on and a welcome back from apps.
export const createMoments = (browser: Window = window) => {
  const conversation = createStore<Conversation>({ answer: null, back: null, turn: 0 });
  let leftFor: string | null = null;
  let welcomeTimer: number | undefined;
  let expiryTimer: number | undefined;

  const change = (patch: Partial<Conversation>) => conversation.set({ ...conversation.getSnapshot(), ...patch });
  const stopTimers = () => {
    browser.clearTimeout(welcomeTimer);
    browser.clearTimeout(expiryTimer);
  };
  const stopPresence = watchPresence(browser, {
    onAway: stopTimers,
    onReturn(awayMs) {
      const app = leftFor;
      leftFor = null;
      if (app !== null && awayMs < LONG_AWAY_MS) {
        change({ back: app });
        welcomeTimer = browser.setTimeout(() => change({ back: null }), WELCOME_MS);
      } else if (awayMs >= MIN_AWAY_MS) {
        change({ answer: null, back: null, turn: conversation.getSnapshot().turn + 1 });
      }
    },
  });

  return {
    conversation,
    opened(app: string) {
      leftFor = app;
      browser.clearTimeout(expiryTimer);
      expiryTimer = browser.setTimeout(() => {
        leftFor = null;
      }, LAUNCH_EXPIRY_MS);
    },
    reply(mood: Mood) {
      const { turn } = conversation.getSnapshot();
      change({ answer: answerFor(mood, turn) });
    },
    dispose() {
      stopTimers();
      stopPresence();
    },
  };
};

export type Moments = ReturnType<typeof createMoments>;
