const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const { loadTypeScript } = require("./helpers/load_typescript.cjs");
const conversation = loadTypeScript("launcher/src/home/macos/conversation.ts");
const { describeMemory, selectTasks } = loadTypeScript("launcher/src/home/macos/tasks.ts");
const { clipUrl, createPhotoRotation, photoUrl, PHOTOS } = loadTypeScript("launcher/src/backgrounds/photoRotation.ts");
const { createPasscode, matchesPasscode, sha256 } = loadTypeScript("launcher/src/home/macos/passcode.ts");

const root = path.join(__dirname, "..");
const MB = 1024 * 1024;

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test("the greeting follows the time of day and always has a question", () => {
  const salutations = { 3: "night", 8: "morning", 14: "afternoon", 19: "evening", 23: "night" };
  for (const [hour, part] of Object.entries(salutations)) {
    for (const turn of [0, 1, 2]) {
      const { salutation, question } = conversation.greetingFor(Number(hour), turn);
      assert.equal(salutation, "greeting." + part);
      assert.match(question, /^greeting\.ask/);
    }
  }
});

test("every photo shows before any repeats, and a new round never repeats the last photo", () => {
  const rotation = createPhotoRotation(memoryStorage());
  const firstRound = PHOTOS.map(() => rotation.advance());
  assert.equal(new Set(firstRound).size, PHOTOS.length);
  for (let round = 0; round < 20; round++) {
    const last = firstRound[firstRound.length - 1];
    const next = PHOTOS.map(() => rotation.advance());
    assert.equal(new Set(next).size, PHOTOS.length);
    if (round === 0) {
      assert.notEqual(next[0], last);
    }
  }
});

test("the photo position survives a restart, and peek matches what comes next", () => {
  const storage = memoryStorage();
  const first = createPhotoRotation(storage);
  const shown = first.advance();
  const restarted = createPhotoRotation(storage);
  const peeked = restarted.peek();
  const next = restarted.advance();
  assert.notEqual(next, shown);
  assert.equal(next, peeked);
});

test("corrupt saved photo data starts a fresh order", () => {
  const storage = memoryStorage();
  storage.setItem("aerotizen.photos.v1", "{not json");
  assert.ok(PHOTOS.includes(createPhotoRotation(storage).advance()));
  storage.setItem("aerotizen.photos.v1", JSON.stringify({ at: 0, order: ["removed-photo"] }));
  assert.ok(PHOTOS.includes(createPhotoRotation(storage).advance()));
});

test("the task list keeps real apps and hides the launcher and Samsung's processes", () => {
  const apps = [
    { id: "org.tizen.netflix-app", name: "Netflix" },
    { id: "9Ur5IzDKqV.TizenYouTube", name: "YouTube" },
    { id: "wizTTT0001.TicTacToe", name: "Tic Tac Toe" },
  ];
  const contexts = [
    { id: "1", appId: "org.tizen.netflix-app" },
    { id: "2", appId: "com.samsung.tv.acr" },
    { id: "3", appId: "DclHome001.Home" },
    { id: "4", appId: "DclHome001.Watcher" },
    { id: "5", appId: "com.samsung.tv.cobalt-yt" },
    { id: "6", appId: "wizTTT0001.Service" },
    { id: "7", appId: "wizTTT0001.TicTacToe" },
    { id: "8", appId: "org.tizen.chromium-efl.wrt-service" },
  ];
  const tasks = selectTasks(contexts, apps, (id) => (id === "org.tizen.netflix-app" ? "3201907018807" : null));
  assert.deepEqual(
    tasks.map(({ app }) => app.name),
    ["Netflix", "Tic Tac Toe", "YouTube"],
  );
  assert.equal(tasks[0].restId, "3201907018807");
  assert.deepEqual([...tasks[1].contextIds], ["6", "7"], "an app's processes share one row");
  assert.equal(tasks[2].restId, "111299001912");
});

test("memory is reported as used, not free", () => {
  const reading = describeMemory(1578 * 1048576, 335 * 1048576);
  assert.equal(reading.percent, 79);
  assert.equal(reading.usedGb, "1.2");
  assert.equal(reading.totalGb, "1.5");
  assert.equal(describeMemory(0, 0).percent, 0);
});

test("every wallpaper photo has a quick 1080p image and a 4K clip in the package", () => {
  for (const name of PHOTOS) {
    const photo = path.join(root, "launcher", photoUrl(name));
    const clip = path.join(root, "launcher", clipUrl(name));
    assert.ok(fs.statSync(photo).size < 2 * MB, name + " photo");
    assert.ok(fs.statSync(clip).size < 8 * MB, name + " clip");
  }
});

test("the passcode hash is a real SHA-256", () => {
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  // Exactly fills a block once padded, which is where a wrong padding length would show.
  assert.equal(sha256("a".repeat(56)), "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a");
});

test("a passcode is stored salted, and only the right code matches", () => {
  const first = createPasscode("1234");
  const second = createPasscode("1234");
  assert.notEqual(first.passcodeSalt, second.passcodeSalt);
  assert.notEqual(first.passcodeHash, second.passcodeHash);
  assert.ok(!JSON.stringify(first).includes("1234"));
  assert.equal(matchesPasscode("1234", first.passcodeSalt, first.passcodeHash), true);
  assert.equal(matchesPasscode("4321", first.passcodeSalt, first.passcodeHash), false);
});
