import type { LauncherRuntime } from "../../platform/tizen/launcherRuntime";
import { createStore } from "../../shared/state/createStore";

import type { AppContext, RunningTask } from "./tasks";
import { describeMemory, selectTasks } from "./tasks";

export type StopState = "stopping" | "refused";

interface TizenSystem {
  application: {
    getAppsContext(success: (contexts: AppContext[]) => void, failure?: () => void): void;
    kill(contextId: string, success?: () => void, failure?: (error: Error) => void): void;
  };
  systeminfo: { getAvailableMemory(): number; getTotalMemory(): number };
}

// Stands in for the TV in the browser preview and in tests.
export interface SystemDemo {
  availableBytes: number;
  contexts: AppContext[];
  stoppable: boolean;
  totalBytes: number;
  // Preview only: use the 4K wallpaper clips, which normally only play on a TV.
  videoPlane?: boolean;
}

declare global {
  interface Window {
    AeroSystemDemo?: SystemDemo;
  }
}

const REFRESH_MS = 5000;
const SETTLE_MS = 1500;
const SERVICE_TIMEOUT_MS = 4000;

const systemOf = (browser: Window) => (browser as Window & { tizen?: TizenSystem }).tizen;

// Reads memory and running apps while the launcher is on screen, and force-stops apps on request.
export const createSystemStats = (runtime: LauncherRuntime, browser: Window = window) => {
  const tasks = createStore<readonly RunningTask[]>([]);
  const memory = createStore<ReturnType<typeof describeMemory> | null>(null);
  const stopping = createStore<Readonly<Record<string, StopState>>>({});
  let disposed = false;

  const storeId = (appId: string) => runtime.catalog?.preloadedStoreId(appId) || null;
  const publishTasks = (contexts: readonly AppContext[]) => {
    if (!disposed) {
      tasks.set(selectTasks(contexts, runtime.apps.all, storeId));
    }
  };
  const refresh = () => {
    if (browser.document.hidden) {
      return;
    }
    const demo = browser.AeroSystemDemo;
    if (demo) {
      memory.set(describeMemory(demo.totalBytes, demo.availableBytes));
      publishTasks(demo.contexts);
      return;
    }
    const system = systemOf(browser);
    if (!system) {
      return;
    }
    try {
      memory.set(describeMemory(system.systeminfo.getTotalMemory(), system.systeminfo.getAvailableMemory()));
      system.application.getAppsContext(publishTasks);
    } catch {
      /* The widgets keep their last reading. */
    }
  };

  const setStopState = (appId: string, state: StopState | null) => {
    const { [appId]: previous, ...others } = stopping.getSnapshot();
    stopping.set(state ? { ...others, [appId]: state } : others);
  };

  const askServiceToStop = (restId: string) =>
    new Promise<void>((resolve) => {
      const request = new XMLHttpRequest();
      request.open("GET", runtime.config.SERVICE_URL + "/stop?id=" + encodeURIComponent(restId));
      request.timeout = SERVICE_TIMEOUT_MS;
      request.onloadend = () => resolve();
      request.send();
    });
  const killContexts = (contextIds: readonly string[]) => {
    const system = systemOf(browser);
    contextIds.forEach((contextId) => {
      try {
        system?.application.kill(contextId);
      } catch {
        /* Tizen reserves this for partner apps on most firmware, so the local API goes first. */
      }
    });
  };

  // Success is judged by whether the app really left the running list, not by what any API replies.
  const stop = async (task: RunningTask) => {
    setStopState(task.app.id, "stopping");
    const demo = browser.AeroSystemDemo;
    if (demo) {
      if (demo.stoppable) {
        demo.contexts = demo.contexts.filter(({ id }) => !task.contextIds.includes(id));
      }
    } else {
      await askServiceToStop(task.restId);
      killContexts(task.contextIds);
    }
    browser.setTimeout(() => {
      refresh();
      browser.setTimeout(() => {
        const stillRunning = tasks.getSnapshot().some(({ app }) => app.id === task.app.id);
        setStopState(task.app.id, stillRunning ? "refused" : null);
      }, SETTLE_MS / 3);
    }, SETTLE_MS);
  };

  const timer = browser.setInterval(refresh, REFRESH_MS);
  browser.document.addEventListener("visibilitychange", refresh);
  const unsubscribeApps = runtime.apps.subscribe(refresh);
  refresh();

  return {
    tasks,
    memory,
    stopping,
    refresh,
    stop,
    dispose() {
      disposed = true;
      browser.clearInterval(timer);
      browser.document.removeEventListener("visibilitychange", refresh);
      unsubscribeApps();
    },
  };
};

export type SystemStats = ReturnType<typeof createSystemStats>;
