import type { LauncherRuntime } from "./platform/tizen/launcherRuntime";

// Browser preview of the macOS layout: open /?demo=macos, and add &sky=18:30 to pick the wallpaper's time.
const params = new URLSearchParams(location.search);
const sky = /^(\d{1,2}):(\d{2})$/.exec(params.get("sky") || "");

if (sky) {
  const hours = Number(sky[1]);
  const minutes = Number(sky[2]);
  const RealDate = Date;
  window.Date = class extends RealDate {
    constructor(...args: []) {
      super(...args);
      if (args.length === 0) {
        this.setHours(hours, minutes);
      }
    }
  } as DateConstructor;
}

if (params.get("demo") === "macos" && !("tizen" in window)) {
  window.AeroSystemDemo = {
    totalBytes: 1578 * 1048576,
    availableBytes: 335 * 1048576,
    stoppable: true,
    videoPlane: params.has("plane"),
    contexts: [
      { id: "1", appId: "demo0" },
      { id: "2", appId: "demo1" },
      { id: "3", appId: "demo3" },
      { id: "4", appId: "com.samsung.tv.acr" },
    ],
  };
  const runtime = window.AeroTizen;
  const config = runtime.config as LauncherRuntime["config"] & { STORAGE_KEY: string; LEGACY_STORAGE_KEYS: string[] };
  config.STORAGE_KEY += ".macos";
  config.LEGACY_STORAGE_KEYS = [];
  Object.assign(config.DEFAULTS, {
    macosLook: true,
    glassSettings: true,
    background: "photos",
    hideDisconnectedHdmi: true,
    greetingName: "Utsav",
    home: ["demo0", "demo1", "demo3", "demo6", "demo8", "demo4", "demo7"],
  });
}
