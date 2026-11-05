import { createRef, render } from "preact";
import { flushSync } from "preact/compat";

import type { SettingsStore } from "../contracts/preferences";
import type { StatusStores } from "../contracts/status";
import type { LauncherUpdateNotice } from "../contracts/updates";
import type { LauncherRuntime } from "../platform/tizen/launcherRuntime";
import type { Translations } from "../shared/i18n/createTranslations";
import { TranslationContext } from "../shared/i18n/useTranslation";

import { Home } from "./Home";
import { createLocks } from "./macos/createLocks";
import { createMoments } from "./macos/createMoments";
import { createSystemStats } from "./macos/createSystemStats";
import { createHomeController } from "./state/createHomeController";
import { createHomeInventory } from "./state/createHomeInventory";

const LAUNCHPAD_COLUMNS = 7;

export const mountHome = (
  runtime: LauncherRuntime,
  settings: SettingsStore,
  mount: HTMLElement,
  status: StatusStores,
  translations: Translations,
  updates: LauncherUpdateNotice,
) => {
  const document = mount.ownerDocument;
  // Apply shell mode before any Home focus geometry is measured.
  const syncShell = () => {
    const values = settings.getSnapshot();
    document.body.classList.toggle("glass-ui", values.glassSettings || values.macosLook);
    document.body.classList.toggle("macos-ui", values.macosLook);
    document.body.classList.toggle("clock-layout-compact", values.clockLayout !== "custom");
  };
  syncShell();
  const unsubscribeShell = settings.subscribe(syncShell);
  const inventory = createHomeInventory(runtime, settings, flushSync);
  const rows = createRef<HTMLElement>();
  const moments = createMoments();
  const stats = createSystemStats(runtime);
  const locks = createLocks({
    runtime,
    settings,
    translate: (key, values) => translations.getSnapshot().t(key, values),
  });
  const environment = createHomeController(
    {
      locks,
      moments,
      stats,
      runtime,
      settings,
      inventory,
      status,
      updates,
      rows,
      continueItems: createRef<HTMLDivElement>(),
      continueViewport: createRef<HTMLDivElement>(),
      nodes: new Map(),
      showMoveInstructions: () => runtime.toast(translations.getSnapshot().t("home.moveInstructions")),
      describe: (app) => runtime.tiles.describe(app),
      columns: (values) => {
        if (values.macosLook) {
          return LAUNCHPAD_COLUMNS;
        }
        return [3, 4, 5].includes(Number(values.homeCardColumns))
          ? Number(values.homeCardColumns)
          : runtime.config.CARD_COLUMNS[values.cardSize === "small" ? "small" : "big"];
      },
    },
    flushSync,
  );
  const refresh = () => {
    locks.boot();
    inventory.refresh();
    environment.bridge.focus();
  };
  const bridge = { ...environment.bridge, render: refresh, buildRows: refresh, refreshApps: refresh };
  const dispose = () => {
    environment.bridge.blur();
    locks.dispose();
    moments.dispose();
    stats.dispose();
    render(null, mount);
    inventory.dispose();
    unsubscribeShell();
    document.body.classList.remove("glass-ui", "macos-ui", "clock-layout-compact");
  };
  try {
    render(
      <TranslationContext.Provider value={translations}>
        <Home env={environment} />
      </TranslationContext.Provider>,
      mount,
    );
    return { bridge, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
};
