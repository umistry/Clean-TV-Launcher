import type { SettingsStore } from "../../contracts/preferences";
import type { LauncherRuntime } from "../../platform/tizen/launcherRuntime";
import type { MessageKey } from "../../shared/i18n/catalogues";
import { watchPresence } from "../../shared/presence/watchPresence";
import { createStore } from "../../shared/state/createStore";

import { createPasscode, matchesPasscode, PASSCODE_LENGTH } from "./passcode";

export const PAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "cancel", "0", "delete"] as const;
export type PadKey = (typeof PAD_KEYS)[number];
type TitleValues = Readonly<Record<string, string>>;

export interface PasscodePrompt {
  // A prompt that covers the whole TV: it can't be dismissed, only answered.
  readonly cover: boolean;
  readonly digits: number;
  readonly key: number;
  readonly notice: MessageKey | null;
  readonly title: MessageKey;
  readonly titleValues?: TitleValues;
}
export type LockMenuAction = "change" | "lock-now" | "power-on" | "remove";
export interface LockMenuChoice {
  readonly action: LockMenuAction;
  readonly label: MessageKey;
  readonly on?: boolean;
}
interface PadRequest {
  readonly cover?: boolean;
  onEntered(code: string): void;
  readonly title: MessageKey;
  readonly titleValues?: TitleValues;
}
interface ServiceLockState {
  readonly locked?: boolean;
}

const PAD_COLUMNS = 3;
const CANCEL_AT = PAD_KEYS.indexOf("cancel");
const ZERO_AT = PAD_KEYS.indexOf("0");
const START_AT = PAD_KEYS.indexOf("5");
const MAX_TRIES = 5;
const COOLDOWN_MS = 30000;
const REQUEST_TIMEOUT_MS = 1500;
const REPORT_RETRY_MS = 3000;
const REPORT_TRIES = 5;
// Used only if the background service can't say whether the TV has been off.
const FALLBACK_AWAY_MS = 60000;
const RECENT_OPEN_MS = 4 * 60 * 60 * 1000;

// Owns the app locks and the TV lock: the passcode, what asks for it, and telling the background service.
export const createLocks = ({
  runtime,
  settings,
  translate,
  browser = window,
}: {
  browser?: Window;
  runtime: LauncherRuntime;
  settings: SettingsStore;
  translate(key: MessageKey, values?: TitleValues): string;
}) => {
  const prompt = createStore<PasscodePrompt | null>(null);
  const menu = createStore<number | null>(null);
  const K = runtime.config.KEY;
  const onTv = "tizen" in browser;
  let request: PadRequest | null = null;
  let entered = "";
  let tries = 0;
  let blockedUntil = 0;
  let enterDown = false;
  let booted = false;
  let lastOpenedAt = 0;
  let reportedArmed: boolean | null = null;
  let cooldownTimer: number | undefined;
  let retryTimer: number | undefined;

  const hasPasscode = () => Boolean(settings.getSnapshot().passcodeHash);
  const armed = () => hasPasscode() && settings.getSnapshot().lockOnPowerOn;
  const isCovered = () => Boolean(prompt.getSnapshot()?.cover);

  const askService = async (path: string): Promise<ServiceLockState | null> => {
    if (!onTv) {
      return null;
    }
    const controller = new AbortController();
    const timer = browser.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const reply = await browser.fetch(runtime.config.SERVICE_URL + path, { signal: controller.signal });
      return reply.ok ? ((await reply.json()) as ServiceLockState) : null;
    } catch {
      return null;
    } finally {
      browser.clearTimeout(timer);
    }
  };
  // The service may still be starting when the TV boots, so what it must know is retried.
  const report = (path: string, triesLeft = REPORT_TRIES) => {
    browser.clearTimeout(retryTimer);
    void askService(path).then((reply) => {
      if (onTv && !reply && triesLeft > 1) {
        retryTimer = browser.setTimeout(() => report(path, triesLeft - 1), REPORT_RETRY_MS);
      }
    });
  };
  const armPath = () => "/lock?arm=" + (armed() ? "1" : "0");
  const reportArmed = () => {
    if (armed() !== reportedArmed) {
      reportedArmed = armed();
      report(armPath() + (hasPasscode() ? "" : "&on=0"));
    }
  };

  const change = (patch: Partial<PasscodePrompt>) => {
    const current = prompt.getSnapshot();
    if (current) {
      prompt.set({ ...current, ...patch });
    }
  };
  const close = () => {
    request = null;
    entered = "";
    prompt.set(null);
  };
  const ask = (next: PadRequest, notice: MessageKey | null = null) => {
    request = next;
    entered = "";
    prompt.set({
      cover: Boolean(next.cover),
      digits: 0,
      key: START_AT,
      notice,
      title: next.title,
      titleValues: next.titleValues,
    });
  };
  const check = (code: string, onSuccess: () => void) => {
    const { passcodeHash, passcodeSalt } = settings.getSnapshot();
    if (matchesPasscode(code, passcodeSalt, passcodeHash)) {
      tries = 0;
      close();
      onSuccess();
      return;
    }
    tries += 1;
    if (tries < MAX_TRIES) {
      change({ digits: 0, notice: "lock.wrong" });
      return;
    }
    tries = 0;
    blockedUntil = Date.now() + COOLDOWN_MS;
    change({ digits: 0, notice: "lock.tooMany" });
    browser.clearTimeout(cooldownTimer);
    cooldownTimer = browser.setTimeout(() => change({ notice: null }), COOLDOWN_MS);
  };
  const verify = (title: MessageKey, onSuccess: () => void, titleValues?: TitleValues) => {
    if (!hasPasscode()) {
      onSuccess();
      return;
    }
    ask({ title, titleValues, onEntered: (code) => check(code, onSuccess) });
  };
  const choosePasscode = (onChosen: (code: string) => void, notice: MessageKey | null = null) =>
    ask(
      {
        title: "lock.create",
        onEntered(first) {
          ask({
            title: "lock.confirm",
            onEntered(second) {
              if (first === second) {
                close();
                onChosen(first);
              } else {
                choosePasscode(onChosen, "lock.mismatch");
              }
            },
          });
        },
      },
      notice,
    );

  const lockTv = () => {
    if (!hasPasscode() || isCovered()) {
      return;
    }
    menu.set(null);
    if (runtime.settingsUi?.isOpen()) {
      runtime.settingsUi.close();
    }
    if (runtime.inputs.watching) {
      runtime.inputs.leave?.();
    }
    ask({
      cover: true,
      title: "lock.enter",
      onEntered: (code) => check(code, () => report(armPath() + "&on=0")),
    });
    report(armPath() + "&on=1");
  };

  const typeDigit = (digit: string) => {
    if (Date.now() < blockedUntil || !request) {
      return;
    }
    entered += digit;
    if (entered.length < PASSCODE_LENGTH) {
      change({ digits: entered.length, notice: null });
      return;
    }
    const code = entered;
    entered = "";
    request.onEntered(code);
  };
  const deleteDigit = () => {
    entered = entered.slice(0, -1);
    change({ digits: entered.length });
  };
  const cancel = () => {
    if (!isCovered()) {
      close();
    }
  };
  const pressKey = (index: number) => {
    const key = PAD_KEYS[index];
    if (key === "cancel") {
      cancel();
    } else if (key === "delete") {
      deleteDigit();
    } else {
      typeDigit(key);
    }
  };
  const movePad = (current: PasscodePrompt, code: number) => {
    const { key, cover } = current;
    const column = key % PAD_COLUMNS;
    const next = (() => {
      if (code === K.LEFT) {
        return column === 0 ? key : key - 1;
      }
      if (code === K.RIGHT) {
        return column === PAD_COLUMNS - 1 ? key : key + 1;
      }
      return key + (code === K.UP ? -PAD_COLUMNS : PAD_COLUMNS);
    })();
    if (next < 0 || next >= PAD_KEYS.length) {
      return;
    }
    if (cover && next === CANCEL_AT) {
      // The TV lock has no Cancel, so Down from 7 lands on 0 and Left from 0 stays put.
      change({ key: code === K.DOWN ? ZERO_AT : key });
      return;
    }
    change({ key: next });
  };
  const padKeydown = (code: number, current: PasscodePrompt) => {
    if (code >= 48 && code <= 57) {
      typeDigit(String(code - 48));
    } else if (code === K.BACK || code === K.ESC) {
      if (entered) {
        deleteDigit();
      } else {
        cancel();
      }
    } else if (code === K.ENTER) {
      if (!enterDown) {
        enterDown = true;
        pressKey(current.key);
      }
    } else if ([K.LEFT, K.RIGHT, K.UP, K.DOWN].includes(code)) {
      movePad(current, code);
    }
  };

  const menuChoices = (): readonly LockMenuChoice[] => [
    { action: "lock-now", label: "lock.lockNow" },
    { action: "power-on", label: "lock.onPowerOn", on: settings.getSnapshot().lockOnPowerOn },
    { action: "change", label: "lock.change" },
    { action: "remove", label: "lock.remove" },
  ];
  const notify = (key: MessageKey, values?: TitleValues) => runtime.toast(translate(key, values));
  const savePasscode = (code: string, patch: { lockOnPowerOn?: boolean }, message: MessageKey) => {
    settings.update({ ...createPasscode(code), ...patch });
    notify(message);
    menu.set(0);
  };
  const openMenu = () => {
    if (hasPasscode()) {
      menu.set(0);
    } else {
      choosePasscode((code) => savePasscode(code, { lockOnPowerOn: true }, "lock.created"));
    }
  };
  const chooseMenu = (index: number) => {
    const choice = menuChoices()[index];
    if (!choice) {
      return;
    }
    menu.set(null);
    if (choice.action === "lock-now") {
      lockTv();
    } else if (choice.action === "power-on") {
      verify("lock.enterCurrent", () => {
        settings.update({ lockOnPowerOn: !settings.getSnapshot().lockOnPowerOn });
        menu.set(index);
      });
    } else if (choice.action === "change") {
      verify("lock.enterCurrent", () => choosePasscode((code) => savePasscode(code, {}, "lock.changed")));
    } else {
      verify("lock.enterCurrent", () => {
        settings.update({ passcodeHash: "", passcodeSalt: "", lockOnPowerOn: false, lockedApps: [] });
        notify("lock.removed");
      });
    }
  };
  const menuKeydown = (code: number, selected: number) => {
    if (code === K.BACK || code === K.ESC) {
      menu.set(null);
    } else if (code === K.ENTER) {
      if (!enterDown) {
        enterDown = true;
        chooseMenu(selected);
      }
    } else if (code === K.UP || code === K.DOWN) {
      const last = menuChoices().length - 1;
      menu.set(Math.max(0, Math.min(last, selected + (code === K.UP ? -1 : 1))));
    }
  };

  const isLocked = (id: string) => settings.getSnapshot().lockedApps.includes(id);
  const setAppLocked = (id: string, name: string, locked: boolean) => {
    const others = settings.getSnapshot().lockedApps.filter((item) => item !== id);
    settings.update({ lockedApps: locked ? [...others, id] : others });
    notify(locked ? "lock.appLocked" : "lock.appUnlocked", { name });
  };

  const unsubscribe = settings.subscribe(reportArmed);
  const stopPresence = watchPresence(browser, {
    onAway() {},
    onReturn(awayMs) {
      if (!armed()) {
        return;
      }
      // The service tells a TV power cycle apart from coming back from an app, and pulls the launcher back too.
      void askService(armPath()).then((service) => {
        const offWhileAway = awayMs >= FALLBACK_AWAY_MS && Date.now() - lastOpenedAt > RECENT_OPEN_MS;
        if (service ? service.locked : offWhileAway) {
          lockTv();
        }
      });
    },
  });

  return {
    prompt,
    menu,
    menuChoices,
    chooseMenu,
    openMenu,
    pressKey,
    cancel,
    closeMenu: () => menu.set(null),
    isLocked,
    lockTv,
    holdsKeys: () => prompt.getSnapshot() !== null,
    // Runs once settings have loaded, before the first paint, so a locked TV never shows the Home screen.
    boot() {
      if (booted) {
        return;
      }
      booted = true;
      if (armed()) {
        lockTv();
      }
      reportArmed();
    },
    // Opens an app, asking for the passcode first if it's locked.
    openApp(id: string, name: string, open: () => void) {
      const start = () => {
        lastOpenedAt = Date.now();
        open();
      };
      if (isLocked(id)) {
        verify("lock.enterForApp", start, { name });
      } else {
        start();
      }
    },
    openSettings(open: () => void) {
      verify("lock.enterForSettings", open);
    },
    toggleApp(id: string, name: string) {
      if (isLocked(id)) {
        verify("lock.enterCurrent", () => setAppLocked(id, name, false));
      } else if (hasPasscode()) {
        setAppLocked(id, name, true);
      } else {
        choosePasscode((code) => {
          settings.update({ ...createPasscode(code), lockOnPowerOn: true });
          setAppLocked(id, name, true);
        });
      }
    },
    // Returns whether a prompt or the lock menu took this key.
    keydown(code: number, event: Pick<KeyboardEvent, "preventDefault">) {
      const current = prompt.getSnapshot();
      const selected = menu.getSnapshot();
      if (!current && selected === null) {
        return false;
      }
      event.preventDefault();
      if (current) {
        padKeydown(code, current);
      } else if (selected !== null) {
        menuKeydown(code, selected);
      }
      return true;
    },
    keyup(code: number) {
      if (code === K.ENTER) {
        enterDown = false;
      }
    },
    dispose() {
      browser.clearTimeout(cooldownTimer);
      browser.clearTimeout(retryTimer);
      unsubscribe();
      stopPresence();
    },
  };
};
export type Locks = ReturnType<typeof createLocks>;
