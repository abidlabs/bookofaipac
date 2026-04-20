# Publishing ScanAIPAC (iOS App Store & Google Play)

Use this as a checklist. Adjust names (team, bundle ID, listings) to match your accounts.

---

## 1. Code review (Cursor or human)

See **`CODE_REVIEW.md`** for the recorded security, performance, and policy pass. Re-run that review before each major release.

---

## 2. Remove development-only behavior

See **`CODE_REVIEW.md` § Release hygiene.** Quick grep before shipping:

```bash
rg -n "DEV_|__DEV__|debug\\)|TODO|FIXME|localhost" mobile/src mobile/App.tsx
```

---

## 3. Versioning and EAS profiles

- Bump **`expo.version`** in `app.json` for each user-facing release (e.g. `1.0.0` → `1.0.1`).
- **iOS:** Set `ios.buildNumber` (Expo can manage via EAS; see [App versions](https://docs.expo.dev/build-reference/app-versions/)).
- **Android:** `versionCode` must increase every Play upload (EAS can auto-increment).
- **`eas.json`:** Use the **`production`** profile for store binaries (not `development`). Configure `production` with `developmentClient: false` (default) and appropriate `autoIncrement` if desired.

Example production build commands (after `eas login`):

```bash
cd mobile
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

---

## 4. Apple: App Store Connect

1. **Apple Developer Program** membership (paid).
2. **App Store Connect** → New App → bundle ID `com.bookofaipac.scanaipac` (must match `app.json`).
3. **Privacy Nutrition Labels** and **App Privacy** questionnaire: camera, location (if used), whether data is collected (this app is largely on-device; align answers with reality).
4. **Export compliance:** `ITSAppUsesNonExemptEncryption` is set to `false` in `app.json` for standard HTTPS only; confirm with your legal/compliance needs.
5. **Review notes:** Explain camera + OCR for ballot/candidate matching; provide demo steps if needed.
6. **Submit:** After EAS production iOS build, use **`eas submit -p ios`** or upload via Transporter and attach to the version in App Store Connect.

---

## 5. Google: Play Console

1. **Play Developer** account (one-time fee).
2. Create app → **package name** must match `android.package` (`com.bookofaipac.scanaipac`).
3. **Data safety form:** Declare camera, location, and any data collection; keep consistent with the app.
4. **Permissions:** Review `app.json` `android.permissions`. Remove any permission you do not need (e.g. if `RECORD_AUDIO` was pulled in indirectly, confirm with [Expo prebuild output](https://docs.expo.dev/) or remove unused plugins; Play reviewers care about declared vs used permissions).
5. **Content rating** questionnaire.
6. **Release:** Upload AAB from EAS production Android build (`eas build -p android --profile production` produces AAB when configured), then roll out internal → closed → production as you prefer.

---

## 6. Assets to prepare

| Asset | iOS | Android |
|--------|-----|---------|
| **App icon** | 1024×1024 (App Store); Expo uses `assets/icon.png` | Adaptive icon foreground + background (Expo adaptive icon config in `app.json`) |
| **Screenshots** | Required sizes per device class (6.7", 6.5", 5.5", etc.) | Phone + optional tablet |
| **Feature graphic** | N/A | 1024×500 for Play |
| **Short / full description** | App Store metadata | Play listing |
| **Privacy policy URL** | Often required | Required for many categories |
| **Support URL / contact** | App Store | Play |

Generate screenshots from **release** builds on real devices for accurate safe areas.

---

## 7. Store listing copy (suggestions)

- **Subtitle / short:** On-device OCR to match candidates; civic information; link to your site for profiles.
- **Disclaimers:** Match `LandingScreen` / in-app text (AI/OCR limitations, verify official sources).

---

## 8. Submission automation (optional)

```bash
cd mobile
npx eas-cli submit -p ios --latest
npx eas-cli submit -p android --latest
```

Configure credentials once (`eas credentials`). CI can run builds on tag; keep signing secrets out of the repo.

---

## 9. After launch

- Monitor **Crashlytics** / **Expo** crash reports if integrated.
- Respond to **review feedback** (both stores).
- Plan **updates:** version bumps, changelog, staged rollouts on Play.

---

## 10. Related repo docs

- Local development and **development builds:** see `README.md` in this folder.
