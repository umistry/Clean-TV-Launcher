// Navigation keys shared by the Dock view and the Home controller.
export const LAUNCHPAD_KEY = "launchpad";
export const DOCK_ADD_KEY = "dock-add";
export const TASKS_KEY = "task-manager";

export const inputKey = (source: { readonly type: string; readonly number?: number }) =>
  "input:" + source.type + ":" + source.number;
export const STORE_KEY = "open-store";
export const LOCK_KEY = "lock-menu";
