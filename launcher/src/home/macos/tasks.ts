import type { InstalledApp } from "../../contracts/launcher";

export interface AppContext {
  readonly appId: string;
  readonly id: string;
}

export interface RunningTask {
  readonly app: InstalledApp;
  // Every process belonging to this app, such as its window and its background service.
  readonly contextIds: readonly string[];
  // What the TV's local API calls this app, which can differ from its Tizen ID.
  readonly restId: string;
}

// Samsung's own builds of these apps run under a different ID from their entry in the app list.
const ALIASES: Readonly<Record<string, { readonly name: RegExp; readonly restId: string }>> = {
  "com.samsung.tv.cobalt-yt": { name: /^youtube$/i, restId: "111299001912" },
};

const SELF = /^DclHome001\./;
const packageOf = (id: string) => id.split(".")[0];

// The TV runs about 60 processes, most of them Samsung's own. Only apps you could have opened are listed.
export const selectTasks = (
  contexts: readonly AppContext[],
  apps: readonly InstalledApp[],
  storeId: (appId: string) => string | null,
): readonly RunningTask[] => {
  const tasks = new Map<string, { app: InstalledApp; contextIds: string[]; restId: string }>();
  for (const context of contexts) {
    if (SELF.test(context.appId)) {
      continue;
    }
    const alias = ALIASES[context.appId];
    const app =
      apps.find(({ id }) => id === context.appId) ||
      (alias
        ? apps.find(({ name }) => alias.name.test(name))
        : apps.find(({ id }) => packageOf(id) === packageOf(context.appId) && id.includes(".")));
    if (app) {
      const existing = tasks.get(app.id);
      if (existing) {
        existing.contextIds.push(context.id);
      } else {
        tasks.set(app.id, {
          app,
          contextIds: [context.id],
          restId: alias?.restId || storeId(app.id) || app.storeId || app.id,
        });
      }
    }
  }
  return [...tasks.values()].sort((a, b) => a.app.name.localeCompare(b.app.name));
};

export const describeMemory = (totalBytes: number, availableBytes: number) => {
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const toGb = (bytes: number) => (bytes / 1073741824).toFixed(1);
  return {
    percent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
    usedGb: toGb(usedBytes),
    totalGb: toGb(totalBytes),
  };
};
