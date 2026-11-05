// AeroTizen launcher behaviour and settings. App identities live in app-catalog.js.
window.AeroTizen = window.AeroTizen || {};

AeroTizen.config = {
  APP_ID: "DclHome001.Home",
  SERVICE_ID: "DclHome001.Watcher",
  SERVICE_URL: "http://127.0.0.1:47790",
  // The TV's own local API, which names the app behind each store ID.
  TV_API_URL: "http://127.0.0.1:8001",

  STORAGE_KEY: "aerotizen.settings.v1",
  LEGACY_STORAGE_KEYS: ["hearth.home.v1", "declutter.home.v5"],

  // Remote control key codes (Tizen TV).
  KEY: {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK: 10009,
    ESC: 27,
    IME_DONE: 65376,
    IME_CANCEL: 65385,
  },

  // Apps placed on the home grid the first time, by name prefix, in this order.
  DEFAULT_HOME_APPS: ["youtube", "netflix", "prime video", "stremio", "spotify"],

  // Real user apps: Samsung-store packages (10-char ids) plus the preinstalled streamers,
  // which the TV's local API knows by their store ids. getAppsInfo() returns ~470 entries;
  // everything else is firmware plumbing.
  STORE_PACKAGE: /^[A-Za-z0-9]{10}$/,
  HIDDEN_APPS: /service|emanual|companion|dummy|widget|DclHome001/i,
  // com.samsung.tv.store first: on a Tizen 9 CU7000, org.volt.apps launches to a blank screen.
  STORE_APP_IDS: ["com.samsung.tv.store", "org.volt.apps"],
  HBBTV_APP_ID: "org.tizen.hbbtv",
  HBBTV_LINK_METADATA: "http://samsung.com/tv/metadata/hbbtv.link",

  FIREPLACE_ID: "__fire",
  FIREPLACE_VIDEO: "WuHSBSLK3_A",

  CARD_COLUMNS: { big: 3, small: 5 }, // Settings → App cards
  LONG_PRESS_MS: 600,
  // How long an app that reported an error gets to take the screen before we believe the error.
  EXTERNAL_OPEN_GRACE_MS: 4000,
  // Sent on `document` just before the launcher gives the screen to an app or input.
  HANDOFF_EVENT: "aerotizen:handoff",
  SPEED: { MIN: 0.25, MAX: 3, STEP: 0.25 },

  DEFAULTS: {
    home: null, // null selects defaults on first launch; [] keeps an empty Home.
    cardSize: "big",
    glassSettings: false, // Optional Preact Glass categories and source dock.
    macosLook: false, // Menu bar, Dock and Launchpad. Fresh TV installs get MACOS_FRESH_INSTALL.
    greetingEnabled: true,
    greetingName: "",
    homeCardMode: "square", // Square Samsung artwork remains the default.
    homeCardColumns: null, // null preserves the existing Big/Small column count.
    background: "aurora",
    weatherPhoto: false, // Opt-in AI-generated scenes using the existing forecast.
    speed: 1,
    showWeather: true,
    showTime: true,
    showNetwork: true,
    tempUnit: null, // Select the locale's weather unit when first loaded.
    weatherLocation: null,
    weatherShowLocation: true,
    dateFormat: "short",
    language: "auto",
    numerals: "latn", // Arabic only: Western (latn) or Arabic-Indic (arab) digits.
    // Existing installs continue using the unchanged compact header.
    clockLayout: "classic",
    aeroClockStyle: "vertical",
    timeFormat: null, // Detect 12/24-hour format when first loaded.
    continueWatching: false,
    continueWatchingApps: [],
    // App locks and the TV lock. The passcode is kept only as a salted hash.
    lockedApps: [],
    lockOnPowerOn: false,
    passcodeHash: "",
    passcodeSalt: "",
    showLiveTv: true,
    hideDisconnectedHdmi: false,
    hdmiKeepVisible: {}, // Optional per-port exception for an unidentified device.
    inputNames: {},
  },

  // Applied once on a TV with no saved settings; saved installs keep their chosen look.
  MACOS_FRESH_INSTALL: {
    macosLook: true,
    glassSettings: true,
    background: "photos",
    hideDisconnectedHdmi: true,
    greetingName: "",
  },
};
