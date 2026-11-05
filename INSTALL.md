# Install guide

This puts TizenOS macOS Launcher on a Samsung TV running Tizen 9 and, optionally, makes it the
TV's Home screen. Allow about 20 minutes. Nothing here needs root, and every change can be undone.

## 1. What you need

- A Samsung TV on **Tizen 9** (step 4 shows how to check).
- A Mac, Windows or Linux computer on the **same network** as the TV.
- A free **Samsung account**, used once to create the signing certificates.
- The TV's IP address: **Settings → All Settings → Connection → Network → Network Status → IP
  Settings**. The examples below write it as `TV_IP`.

## 2. Turn on Developer Mode

1. On the TV, open **Apps**.
2. Type `1` `2` `3` `4` `5` with the remote or the on-screen number pad. On some newer firmware this
   only works from **Apps → App Settings** at the bottom of the Apps tab.
3. Switch **Developer mode** on and enter your **computer's** IP address as Host PC IP. Check all
   four numbers before pressing OK; the first one doesn't always change.
4. **Unplug the TV for 60 seconds**, then plug it back in. Turning it off with the remote isn't
   enough.

## 3. Get the AeroTizen command-line tool

Download the latest **CLI** release (`cli-v2.6.0` or newer) for your computer from
[AeroTizen's releases](https://github.com/helalaou/AeroTizen/releases) and extract it. Open a
terminal in that folder. The commands below use `./aerotizen`; in Windows PowerShell, use
`.\aerotizen.exe` instead.

## 4. Check the TV

```bash
./aerotizen discover
```

```bash
./aerotizen --tv TV_IP status
```

Look for `developerMode=1` and `platform_version 9.0`. If Developer Mode shows 0, repeat step 2,
including the 60-second unplug.

## 5. Create your certificates

This opens Samsung's sign-in page in your browser. The certificates are tied to your TV and stay on
your computer.

```bash
./aerotizen --tv TV_IP certs
```

## 6. Install the launcher

1. Download `tizenos-macos-launcher-2.7.0.zip` from this project's [Releases](https://github.com/umistry/Clean-TV-Launcher/releases) page and unzip it
   into the same folder as `aerotizen`. You should now have a folder called
   `tizenos-macos-launcher`.
2. Install it, open it, and check that its background service is running:

```bash
./aerotizen --tv TV_IP install ./tizenos-macos-launcher
```

```bash
./aerotizen --tv TV_IP launch DclHome001.Home
```

```bash
./aerotizen --tv TV_IP home status
```

The last command should end with `watcher: active`. If it says the service connection was
refused, wait 15 seconds and run it again.

The launcher is now installed. Your remote's Home button still opens Samsung's Home until you
finish step 7.

## 7. Make it your Home screen (recommended)

This makes the Home button and power-on open the launcher instead of Samsung's Home. It's the step
that stops the old Home screen from coming back.

First, save a backup of the TV's original Home settings:

```bash
./aerotizen --tv TV_IP home backup
```

With the launcher on screen, make the switch:

```bash
./aerotizen --tv TV_IP home apply --yes --boot
```

Then **unplug the TV for 60 seconds** and turn it on. The first start can show a black screen for
up to about 30 seconds. Press Home from Live TV, YouTube and another app; each should come back to
the launcher.

To undo it and get Samsung's Home back, run this, then unplug the TV for 60 seconds again:

```bash
./aerotizen --tv TV_IP home restore --yes
```

## 8. Make the TV faster

Deleting preloaded apps and turning off Samsung's tracking frees memory, which is what makes a TV
like this feel slow. On a 1.5 GB UA65CU7700 these steps took free memory from 371 MB to about
590 MB.

**Delete apps you didn't install.** Tizen 9 blocks removing them from a computer, so do it on the
TV: **Apps → Settings (gear, top right) → choose an app → Delete**. Start with preloaded games.
Several of them keep a background service running all the time; on our TV these were Legion of
Zombie Terrors, Tic Tac Toe, Chicken Jockey, Burger Tycoon, Free Games Hub, Caveman Hunt and
clubiza games. To see what's installed, run `./aerotizen --tv TV_IP apps`.

**Turn off Samsung's tracking** under **Settings → All Settings → General & Privacy → Terms &
Privacy → Privacy Choices**:

- **Viewing Information Services:** Off. This identifies what's on screen and reports it.
- **Interest-Based Advertisements:** Off.
- **Voice Recognition Services:** Off, unless you use voice.

**Stop apps starting by themselves** under **Settings → All Settings → General & Privacy → Start
Screen Option**: turn off **Autorun Last App** and **Autorun Samsung TV Plus**. Leave **Start with
Smart Hub Home** on; step 7 uses it to open the launcher at power-on.

**Block Samsung's ad servers (optional):** under **Network Status → IP Settings**, set DNS to
`94.140.14.14` (AdGuard DNS). Set it back to automatic to undo.

Menu names vary a little between models and years.

## 9. Using it

- **Move around** with the arrows; **OK** opens; **hold OK** on an app to move it, remove it from
  the Dock, or lock it.
- **Your name in the greeting:** Settings (gear) → Appearance → Your name.
- **Passcode:** the lock icon in the menu bar. Set a 4-digit code, then choose **Lock TV now** or
  **Ask when the TV turns on**. Once a passcode is set, Settings asks for it too.
- **Running apps:** the "N apps running" item in the menu bar. Choose an app and press OK to force
  stop it.
- **New apps:** the **App Store** item in the menu bar opens Samsung's store. New apps appear in
  the Launchpad.

## 10. Updating

Delete the old `tizenos-macos-launcher` folder, unzip the new release in its place, and run step 6's
`install` command again. Your settings, Dock and passcode are kept.

**Never run `aerotizen update launcher`.** It installs the original AeroTizen launcher over this
one.

## 11. Uninstalling

Restore Samsung's Home first (the last command in step 7, then the 60-second unplug), then:

```bash
./aerotizen --tv TV_IP uninstall launcher
```

## Troubleshooting

**Developer Mode keeps turning off, or `status` can't connect.** Unplug the TV for a full 60
seconds after changing Developer Mode. Check that Host PC IP matches your computer's current IP.

**The old Samsung Home still appears.** Step 7 hasn't been applied yet: `home status` shows
`mode=stock`. Run `home apply --yes --boot` and unplug the TV for 60 seconds.

**Home from an app does nothing, or the launcher doesn't come back.** Run `home status`. If the
service connection is refused, open the launcher once with
`./aerotizen --tv TV_IP launch DclHome001.Home` and check again.

**Force stop says Samsung keeps an app loaded.** That's expected for Netflix and Apple TV. Samsung
preloads them and only lets its partner apps close them. The TV frees that memory when it needs
it.

**I forgot my passcode.** With Developer Mode still on, run
`./aerotizen --tv TV_IP inspect launcher` and leave it running. In Chrome, open
`chrome://inspect`, click **Configure…**, add `localhost:9222`, then click **inspect** under the
launcher. In its **Console**, paste this and press Enter:

```js
Object.assign(AeroTizen.settings, { passcodeHash: "", passcodeSalt: "", lockOnPowerOn: false, lockedApps: [] });
AeroTizen.settings.save();
location.reload();
```

The passcode, app locks and power-on lock are removed. Press Ctrl+C in the terminal to close the
inspector.
