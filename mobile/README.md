# ScanAIPAC (Expo mobile)

This app uses native modules (including `expo-text-extractor`) that are **not** included in **Expo Go**. You run a **development build**: a normal iOS app installed on your phone that loads JavaScript from Metro on your Mac, with Fast Refresh like a typical Expo workflow.

---

## Prerequisites

- Node.js and npm
- An [Expo](https://expo.dev) account (`npx eas-cli login`)
- For **iOS on a physical device**: an Apple Developer account so EAS can create signing assets and an **ad hoc** install that includes your iPhone’s UDID

---

## One-time: install the development build on your iPhone

From this directory:

```bash
npm install
npx eas-cli login
npm run build:ios
```

Complete the EAS prompts (Apple ID, 2FA, team, device registration). The **development** profile in `eas.json` produces a **development client** (`developmentClient: true`).

When the build finishes, open the build on [expo.dev](https://expo.dev) and install the app on your phone from the link EAS provides (ad hoc / internal flow depends on your project settings).

You only need a **new** iOS build when native dependencies, bundle identifier, entitlements, or similar change—not for everyday JS edits.

---

## Every day: run Metro and use the dev client

Use a normal terminal (Terminal.app or iTerm), not a stripped-down environment that sets `CI=true` (that can disable Metro watch/reload).

1. Put your Mac and iPhone on the **same Wi‑Fi** (or use tunnel; see below).

2. Start the bundler in **dev-client** mode with a **LAN** hostname so the phone does not try to use `localhost` (which on the phone means the phone itself):

   ```bash
   npm run start:devclient
   ```

   This runs `scripts/expo-devclient-lan.sh`, which sets `REACT_NATIVE_PACKAGER_HOSTNAME` to your Mac’s Wi‑Fi IP and starts `npx expo start --dev-client --host lan`.

3. On your iPhone, open the **ScanAIPAC** app installed from EAS (the development build), **not** Safari and **not** Expo Go.

4. Connect using the URL or QR from the terminal. It should look like `exp://<your-mac-lan-ip>:8081`, not `exp://localhost:8081`.

If anything asks for a URL manually, use that `exp://…` value from the Metro output.

---

## If LAN is unreliable: tunnel

```bash
npm run start:tunnel
```

First run may install tunnel dependencies. This avoids same-network issues at the cost of speed and an extra hop.

---

## Troubleshooting

- **Safari opens and says “can’t reach localhost”**  
  Do not use the `http://localhost:8081` link in the browser on the phone. Open the **ScanAIPAC dev client** and use the **`exp://`** URL (LAN IP or tunnel host), or scan a QR that points at that `exp://` URL—not a plain `http://localhost` link.

- **Metro still says “Waiting on http://localhost:8081” on the Mac**  
  That line is normal: Metro listens on your Mac. What matters is the **`exp://` address** shown for the **device** (LAN IP or tunnel).

- **QR codes show `localhost` for the app connection**  
  Prefer `npm run start:devclient`, or set the IP yourself before starting:

  ```bash
  export REACT_NATIVE_PACKAGER_HOSTNAME=192.168.x.x
  npx expo start --dev-client --host lan
  ```

  Use your Mac’s Wi‑Fi address (e.g. from **System Settings → Network**).

- **Reload/hot refresh disabled**  
  Ensure `CI` is not set to `true` in the shell (`unset CI`).

- **iOS build failed on EAS**  
  Open the build log URL printed in the CLI (or your project on expo.dev → Builds) and inspect the failing phase (often **Prebuild** if config or native generation failed).

---

## Scripts reference

| Script | Purpose |
|--------|--------|
| `npm run start:devclient` | Dev client + LAN IP helper (recommended for a physical iPhone on the same network) |
| `npm run start:tunnel` | Dev client + Expo tunnel |
| `npm run build:ios` | EAS iOS development build |
| `npm start` | Plain `expo start` (Expo Go-oriented; not sufficient for this app’s native modules) |
