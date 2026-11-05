import type { RefObject } from "preact";

import type { AppPresentation, ContinueItem, HomeBridge, InputSource, InstalledApp } from "../contracts/launcher";
import type { SettingsSnapshot, SettingsStore } from "../contracts/preferences";
import type { StatusStores } from "../contracts/status";
import type { LauncherUpdateNotice } from "../contracts/updates";
import type { LauncherRuntime } from "../platform/tizen/launcherRuntime";
import type { MessageKey } from "../shared/i18n/catalogues";
import type { MutableStore, Store } from "../shared/state/createStore";

import type { Locks } from "./macos/createLocks";
import type { Moments } from "./macos/createMoments";
import type { SystemStats } from "./macos/createSystemStats";
export interface Inventory {
  readonly apps: readonly InstalledApp[];
  readonly inputs: readonly InputSource[];
  readonly items: readonly ContinueItem[];
  readonly ready: boolean;
}
export type Page = "home" | "apps";
export interface HomeMenuChoice {
  readonly action: "add" | "lock" | "move" | "remove" | "unlock";
  readonly label: MessageKey;
}
export interface HomeState {
  readonly active: boolean;
  readonly appsEndOffset: number;
  readonly continueOffset: number;
  readonly draft: readonly string[] | null;
  readonly editingDock: boolean;
  readonly menu: Readonly<{ id: string; selected: number }> | null;
  readonly moving: string | null;
  readonly page: Page;
  readonly scroll: number;
  readonly selected: string;
  readonly taskPanel: number | null;
}
export interface HomeEnvironment {
  activate(key: string): void;
  bridge: HomeBridge;
  choose(index: number): void;
  closeTasks(): void;
  columns(settings: SettingsSnapshot): number;
  continueItems: RefObject<HTMLDivElement>;
  continueViewport: RefObject<HTMLDivElement>;
  describe(app: InstalledApp): AppPresentation;
  dismiss(): void;
  inventory: Store<Inventory>;
  locks: Locks;
  menuChoices(): readonly HomeMenuChoice[];
  moments: Moments;
  nodes: Map<string, HTMLElement>;
  rows: RefObject<HTMLElement>;
  runtime: LauncherRuntime;
  select(key: string): void;
  settings: SettingsStore;
  showMoveInstructions(): void;
  showPage(page: Page): void;
  state: MutableStore<HomeState>;
  stats: SystemStats;
  status: StatusStores;
  updates: LauncherUpdateNotice;
}
