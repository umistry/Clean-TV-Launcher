const { expect, test } = require("@playwright/test");

const { loadTypeScript } = require("../helpers/load_typescript.cjs");
const { createPasscode } = loadTypeScript("launcher/src/home/macos/passcode.ts");

const focused = (page) => page.locator("#home-root .focused").first();

const seed = (page, overrides = {}, demo = {}) =>
  page.addInitScript(
    ([values, system]) => {
      localStorage.setItem(
        "aerotizen.settings.v1",
        JSON.stringify({
          macosLook: true,
          glassSettings: true,
          background: "photos",
          home: ["demo0", "demo1", "demo3"],
          greetingName: "Utsav",
          ...values,
        }),
      );
      window.AeroSystemDemo = {
        totalBytes: 1578 * 1048576,
        availableBytes: 335 * 1048576,
        stoppable: true,
        contexts: [
          { id: "1", appId: "demo0" },
          { id: "2", appId: "demo1" },
          { id: "3", appId: "demo3" },
          { id: "4", appId: "com.samsung.tv.acr" },
        ],
        ...system,
      };
    },
    [overrides, demo],
  );

const open = async (page, overrides, demo) => {
  await seed(page, overrides, demo);
  await page.goto("/");
  await expect(page.locator(".dock__slot--focused .tile")).toHaveAttribute("title", "YouTube");
};

const setHidden = (page, hidden) =>
  page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

const press = (page, key) => page.keyboard.press(key);

const openTaskManager = async (page) => {
  await press(page, "ArrowUp");
  await press(page, "ArrowUp");
  await press(page, "ArrowRight");
  await press(page, "ArrowRight");
  await press(page, "ArrowRight");
  await expect(page.locator("#task-manager")).toHaveClass(/focused/);
  await press(page, "Enter");
};

test("the greeting sits far left, the time far right, memory between, and the centre stays empty", async ({ page }) => {
  await open(page);
  const greeting = await page.locator(".widget--greeting").boundingBox();
  const memory = await page.locator(".widget--memory").boundingBox();
  const clock = await page.locator(".widget--clock").boundingBox();
  expect(greeting.x).toBeLessThan(60);
  expect(clock.x + clock.width).toBeGreaterThan(1860);
  expect(Math.abs(memory.x + memory.width / 2 - 960)).toBeLessThan(2);
  expect(greeting.x + greeting.width).toBeLessThan(memory.x);
  expect(memory.x + memory.width).toBeLessThan(clock.x);
  const dock = await page.locator(".dock").boundingBox();
  for (const widget of [greeting, memory, clock]) {
    expect(widget.y + widget.height).toBeLessThan(420);
  }
  expect(dock.y).toBeGreaterThan(880);
  await expect(page.locator(".kids-stage")).toHaveCount(0);
});

test("the greeting stays on screen and carries a conversation", async ({ page }) => {
  await open(page);
  await expect(page.locator(".widget-greeting__salutation")).toContainText("Utsav");
  await expect(page.locator(".widget-greeting__line")).toHaveText(/\?$/);
  await page.waitForTimeout(300);
  await expect(page.locator(".widget-greeting__reply.focused")).toHaveCount(0);
  await press(page, "ArrowUp");
  await expect(page.locator(".widget-greeting__reply.focused")).toHaveAttribute("title", "Great");
  await press(page, "ArrowRight");
  await expect(page.locator(".widget-greeting__reply.focused")).toHaveAttribute("title", "Okay");
  await press(page, "Enter");
  await expect(page.locator(".widget-greeting__reply")).toHaveCount(0);
  await expect(page.locator(".widget-greeting__salutation")).toContainText("Utsav");
  await expect(page.locator(".widget-greeting__line")).toHaveText(/[.?]$/);
  await expect(page.locator(".dock__slot--focused")).toHaveCount(1);
});

test("memory is shown as used space", async ({ page }) => {
  await open(page);
  await expect(page.locator(".widget-memory__percent")).toHaveText("79%");
  await expect(page.locator(".widget-memory__detail")).toHaveText("1.2 GB of 1.5 GB used");
});

test("the top bar counts running apps, and only real apps are counted", async ({ page }) => {
  await open(page);
  await expect(page.locator(".menubar__tasks-count")).toHaveText("3 apps running");
});

test("the task manager lists running apps and force stops the selected one", async ({ page }) => {
  await open(page);
  await openTaskManager(page);
  await expect(page.locator(".task-row")).toHaveCount(3);
  await expect(page.locator(".task-row.selected")).toHaveCount(1);
  const first = await page.locator(".task-row__name").first().textContent();
  await press(page, "ArrowDown");
  await expect(page.locator(".task-row").nth(1)).toHaveClass(/selected/);
  await press(page, "ArrowUp");
  await press(page, "Enter");
  await expect(page.locator(".task-row__name").first()).not.toHaveText(first, { timeout: 5000 });
  await expect(page.locator(".menubar__tasks-count")).toHaveText("2 apps running");
  await press(page, "Escape");
  await expect(page.locator(".task-manager")).toHaveCount(0);
  await expect(page.locator("#task-manager")).toHaveClass(/focused/);
});

test("a long task list scrolls to keep the selected app in view", async ({ page }) => {
  const contexts = Array.from({ length: 11 }, (_, index) => ({ id: String(index), appId: "demo" + index }));
  await open(page, {}, { contexts });
  await expect(page.locator(".menubar__tasks-count")).toHaveText("11 apps running");
  await openTaskManager(page);
  await expect(page.locator(".task-row")).toHaveCount(11);
  for (let step = 0; step < 10; step++) {
    await press(page, "ArrowDown");
  }
  await expect(page.locator(".task-row").last()).toHaveClass(/selected/);
  const list = await page.locator(".task-manager__list").boundingBox();
  const row = await page.locator(".task-row.selected").boundingBox();
  expect(row.y + row.height).toBeLessThanOrEqual(list.y + list.height + 1);
  expect(row.y).toBeGreaterThanOrEqual(list.y - 1);
});

test("an app the TV won't stop says so instead of pretending", async ({ page }) => {
  await open(page, {}, { stoppable: false });
  await openTaskManager(page);
  await expect(page.locator(".task-row")).toHaveCount(3);
  await press(page, "Enter");
  await expect(page.locator(".task-row__action--stopping")).toHaveCount(1);
  await expect(page.locator(".task-row__action--refused")).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator(".task-row")).toHaveCount(3);
});

test("the plus button adds and removes Dock apps", async ({ page }) => {
  await open(page);
  await expect(page.locator(".dock .tile.app-tile")).toHaveCount(3);
  await press(page, "ArrowRight");
  await press(page, "ArrowRight");
  await press(page, "ArrowRight");
  await expect(focused(page)).toHaveAttribute("title", "Add or remove apps");
  await press(page, "Enter");
  await expect(page.locator(".launchpad-hint")).toBeVisible();
  await expect(page.locator("#grid .tile.is-checked")).toHaveCount(3);
  const picked = await focused(page).getAttribute("title");
  const startedChecked = await page.locator("#grid .tile.focused.is-checked").count();
  await press(page, "Enter");
  await expect(page.locator("#grid .tile.is-checked")).toHaveCount(startedChecked ? 2 : 4);
  await expect(page.locator(".toast")).toBeHidden();
  await press(page, "Escape");
  await expect(page.locator(".launchpad-hint")).toHaveCount(0);
  await expect(page.locator(".dock .tile.app-tile")).toHaveCount(startedChecked ? 2 : 4);
  await expect(focused(page)).toHaveAttribute("title", "Add or remove apps");
  await expect(page.locator(`.dock .tile.app-tile[title="${picked}"]`)).toHaveCount(startedChecked ? 0 : 1);
});

test("holding OK on a Dock app still offers remove, and the choice is saved", async ({ page }) => {
  await open(page);
  await page.keyboard.down("Enter");
  await expect(page.locator(".app-actions-menu.is-open")).toBeVisible();
  await page.keyboard.up("Enter");
  await press(page, "ArrowDown");
  await press(page, "Enter");
  await expect(page.locator(".dock .tile.app-tile")).toHaveCount(2);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("aerotizen.settings.v1")).home);
  expect(saved).toEqual(["demo1", "demo3"]);
});

test("the wallpaper is a new photo after coming back, and a brief interruption keeps it", async ({ page }) => {
  await open(page);
  const photo = page.locator(".bg-photo--entering");
  await expect(photo).toHaveAttribute("src", /assets\/photos\/.+\.jpg$/);
  const first = await photo.getAttribute("src");
  const naturalWidth = await photo.evaluate(async (node) => {
    await node.decode();
    return node.naturalWidth;
  });
  expect(naturalWidth).toBe(1920);
  await setHidden(page, true);
  await setHidden(page, false);
  await expect(photo).toHaveAttribute("src", first);
  const now = await page.evaluate(() => Date.now());
  await setHidden(page, true);
  await page.evaluate((later) => {
    Date.now = () => later;
  }, now + 60000);
  await setHidden(page, false);
  await expect(photo).not.toHaveAttribute("src", first);
});

test("coming back from an app welcomes you by name", async ({ page }) => {
  await open(page);
  await press(page, "Enter");
  await expect(page.locator(".toast")).toContainText("YouTube");
  await setHidden(page, true);
  await setHidden(page, false);
  await expect(page.locator(".widget-greeting__line")).toHaveText("Welcome back, Utsav. How was YouTube?");
  await expect(page.locator(".widget-greeting__reply")).toHaveCount(0);
});

test("the greeting can be switched off, and live video hides the desktop", async ({ page }) => {
  await open(page, { greetingEnabled: false });
  await expect(page.locator(".widget--greeting")).toBeHidden();
  await expect(page.locator(".widget--memory")).toBeVisible();
  await page.evaluate(() => document.body.classList.add("tv"));
  await expect(page.locator(".menubar")).toBeHidden();
  await expect(page.locator(".dock")).toBeHidden();
  await expect(page.locator(".desktop-widgets")).toBeHidden();
});

test("the Launchpad button opens All Apps and Back returns to it", async ({ page }) => {
  await open(page);
  await press(page, "ArrowLeft");
  await expect(focused(page)).toHaveAttribute("title", "All apps");
  await press(page, "Enter");
  await expect(page.locator(".home-page-surface")).toHaveAttribute("data-page", "apps");
  await expect(page.locator(".dock")).toBeHidden();
  await expect(page.locator(".launchpad-scrim")).toBeVisible();
  await expect(page.locator(".desktop-widgets")).toHaveCount(0);
  await expect(page.locator("#grid .tile.focused")).toHaveCount(1);
  await expect(page.locator(".menubar__clock")).toBeVisible();
  await press(page, "Escape");
  await expect(page.locator(".dock")).toBeVisible();
  await expect(focused(page)).toHaveAttribute("title", "All apps");
});

test("Samsung Home is only offered from Settings, never from the top bar", async ({ page }) => {
  await open(page);
  await press(page, "ArrowUp");
  await press(page, "ArrowUp");
  await expect(page.locator("#home-tab")).toHaveClass(/focused/);
  await expect(page.locator("#samsung-home-shortcut")).toHaveCount(0);
  await goToMenuBar(page, "gear");
  await press(page, "Enter");
  await expect(page.locator("[data-key='settings-appearance:macos']")).toHaveCount(1);
  await expect(page.locator("#escape")).toHaveCount(1);
});

test("a Dock app moves sideways only and keeps its new place", async ({ page }) => {
  await open(page);
  await page.keyboard.down("Enter");
  await expect(page.locator(".app-actions-menu.is-open")).toBeVisible();
  await page.keyboard.up("Enter");
  await press(page, "Enter");
  await expect(page.locator(".dock .tile.moving")).toHaveAttribute("title", "YouTube");
  await press(page, "ArrowDown");
  await expect(page.locator(".dock__slot .tile.app-tile").first()).toHaveAttribute("title", "YouTube");
  await press(page, "ArrowRight");
  await expect(page.locator(".dock__slot .tile.app-tile").first()).toHaveAttribute("title", "Netflix");
  await press(page, "Enter");
  await expect(page.locator(".dock .tile.moving")).toHaveCount(0);
  await expect(page.locator(".dock__slot .tile.app-tile").nth(1)).toHaveAttribute("title", "YouTube");
});

test("a saved time-of-day wallpaper moves to the photos", async ({ page }) => {
  await open(page, { background: "dynamic" });
  await expect(page.locator(".bg-photo--entering")).toHaveAttribute("src", /assets\/photos/);
});

const CODE = "1234";
const withPasscode = (extra = {}) => ({ ...createPasscode(CODE), ...extra });
const typeCode = async (page, code) => {
  for (const digit of code) {
    await press(page, digit);
  }
};
const goToMenuBar = async (page, id) => {
  for (let step = 0; step < 3 && !(await page.locator(".menubar .focused").count()); step++) {
    await press(page, "ArrowUp");
  }
  for (let step = 0; step < 6 && !(await page.locator("#" + id + ".focused").count()); step++) {
    await press(page, "ArrowRight");
  }
  await expect(page.locator("#" + id)).toHaveClass(/focused/);
};
const pad = (page) => page.locator(".passcode-pad");

test("the menu bar opens the App Store", async ({ page }) => {
  await open(page);
  await goToMenuBar(page, "open-store");
  await press(page, "Enter");
  await expect(page.locator("#toast-root")).toContainText("app store");
});

test("choosing a passcode asks twice, then the TV can be locked and unlocked", async ({ page }) => {
  await open(page);
  await goToMenuBar(page, "lock-menu");
  await press(page, "Enter");
  await expect(pad(page)).toContainText("Choose a 4-digit passcode");
  await typeCode(page, CODE);
  await expect(pad(page)).toContainText("Enter it again");
  await typeCode(page, "9999");
  await expect(pad(page)).toContainText("didn't match");
  await typeCode(page, CODE);
  await typeCode(page, CODE);
  await expect(page.locator(".lock-menu__row.selected")).toHaveAttribute("data-action", "lock-now");
  await expect(page.locator("[data-action='power-on']")).toContainText("On");
  const saved = await page.evaluate(() => localStorage.getItem("aerotizen.settings.v1"));
  expect(saved).not.toContain('"' + CODE + '"');
  expect(JSON.parse(saved).passcodeHash).toMatch(/^[0-9a-f]{64}$/);

  await press(page, "Enter");
  await expect(page.locator(".passcode--cover")).toBeVisible();
  await expect(page.locator(".dock")).toBeHidden();
  await expect(page.locator(".menubar")).toBeHidden();
  await press(page, "Escape");
  await expect(page.locator(".passcode--cover")).toBeVisible();
  await typeCode(page, "0000");
  await expect(pad(page)).toContainText("Wrong passcode");
  await typeCode(page, CODE);
  await expect(page.locator(".passcode")).toHaveCount(0);
  await expect(page.locator(".dock")).toBeVisible();
});

test("the keypad works with the remote's arrows and OK", async ({ page }) => {
  await open(page, withPasscode());
  await goToMenuBar(page, "gear");
  await press(page, "Enter");
  await expect(pad(page)).toContainText("to open Settings");
  await expect(page.locator(".passcode-pad__key.focused")).toHaveAttribute("data-key", "5");
  // 5 -> 1 -> 2 -> 3 -> 4, each with arrows then OK.
  await press(page, "ArrowUp");
  await press(page, "ArrowLeft");
  await expect(page.locator(".passcode-pad__key.focused")).toHaveAttribute("data-key", "1");
  await press(page, "Enter");
  await press(page, "ArrowRight");
  await press(page, "Enter");
  await press(page, "ArrowRight");
  await press(page, "Enter");
  await expect(page.locator(".passcode-pad__dot.is-filled")).toHaveCount(3);
  await press(page, "ArrowDown");
  await press(page, "ArrowLeft");
  await press(page, "ArrowLeft");
  await expect(page.locator(".passcode-pad__key.focused")).toHaveAttribute("data-key", "4");
  await press(page, "Enter");
  await expect(page.locator(".passcode")).toHaveCount(0);
  await expect(page.locator("[data-key='settings-appearance:macos']")).toHaveCount(1);
});

test("too many wrong passcodes pause the keypad", async ({ page }) => {
  await open(page, withPasscode());
  await goToMenuBar(page, "gear");
  await press(page, "Enter");
  for (let attempt = 0; attempt < 5; attempt++) {
    await typeCode(page, "0000");
  }
  await expect(pad(page)).toContainText("Too many tries");
  await typeCode(page, CODE);
  await expect(page.locator(".passcode-pad__dot.is-filled")).toHaveCount(0);
  await expect(pad(page)).toBeVisible();
});

test("a locked app asks for the passcode, shows a lock, and can be unlocked", async ({ page }) => {
  await open(page, withPasscode({ lockedApps: ["demo0"] }));
  await expect(page.locator(".dock__slot--focused .app-lock-badge")).toBeVisible();
  await press(page, "Enter");
  await expect(pad(page)).toContainText("Enter passcode to open YouTube");
  await press(page, "Escape");
  await expect(page.locator(".passcode")).toHaveCount(0);
  await press(page, "Enter");
  await typeCode(page, CODE);
  await expect(page.locator(".passcode")).toHaveCount(0);
  await expect(page.locator("#toast-root")).toContainText("YouTube");
  await page.keyboard.down("Enter");
  await expect(page.locator(".app-actions-menu.is-open")).toContainText("Unlock app");
  await page.keyboard.up("Enter");
  await press(page, "ArrowDown");
  await press(page, "ArrowDown");
  await press(page, "Enter");
  await typeCode(page, CODE);
  await expect(page.locator(".dock__slot--focused .app-lock-badge")).toHaveCount(0);
});

test("a TV set to ask at power-on starts on the lock screen", async ({ page }) => {
  await seed(page, withPasscode({ lockOnPowerOn: true }));
  await page.addInitScript(() => {
    window.__firstPaintLocked = null;
    new PerformanceObserver((list) => {
      if (list.getEntries().length && window.__firstPaintLocked === null) {
        window.__firstPaintLocked = Boolean(document.querySelector(".passcode--cover"));
      }
    }).observe({ type: "paint", buffered: true });
  });
  await page.goto("/");
  await expect(page.locator(".passcode--cover")).toBeVisible();
  await expect(page.locator(".dock")).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__firstPaintLocked)).toBe(true);
  await typeCode(page, CODE);
  await expect(page.locator(".dock")).toBeVisible();
});

test("the 4K clip sits behind the photo, and is released whenever anything else needs the decoder", async ({
  page,
}) => {
  await page.goto("/");
  // HEVC is a TV and macOS feature; browsers that can't decode the clips skip this test.
  const hevc = await page.evaluate(async () => {
    const video = document.createElement("video");
    video.muted = true;
    video.src = "assets/photos/alpine-peak.mp4";
    try {
      await video.play();
      return video.videoWidth > 0;
    } catch {
      return false;
    }
  });
  test.skip(!hevc, "this browser can't decode the HEVC wallpaper clips");
  await open(page, {}, { videoPlane: true });
  const revealed = page.locator(".bg-photo--revealed");
  await expect(page.locator(".bg-clip")).toHaveCount(1, { timeout: 5000 });
  await expect(revealed).toHaveCount(1, { timeout: 8000 });
  await expect(page.locator("html")).toHaveClass(/has-video-plane/);
  expect(await page.locator(".bg-clip").evaluate((node) => [node.paused, node.videoWidth])).toEqual([true, 3840]);

  await page.evaluate(() => document.dispatchEvent(new CustomEvent(window.AeroTizen.config.HANDOFF_EVENT)));
  await expect(page.locator(".bg-clip")).toHaveCount(0);
  await expect(revealed).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/has-video-plane/);
});

test("a clip that won't play leaves the photo showing", async ({ page }) => {
  await page.route("**/*.mp4", (route) => route.abort());
  await open(page, {}, { videoPlane: true });
  await expect(page.locator(".bg-photo--entering")).toBeVisible();
  await expect(page.locator(".bg-clip")).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator(".bg-photo--revealed")).toHaveCount(0);
});
