# Zero-to-Live Store & AdMob Launch Playbook

Everything in the **GamerBoy Solitaire** codebase (custom icons, splash screen, iOS ATT prompt, AdMob banner SDK, EAS Cloud Build profiles, and public Support & Privacy Policy pages) is ready for store submission.

Because you are setting up your developer and ad accounts for the first time, follow these **6 steps in order** (several accounts have a 24–48 hour verification window from Apple/Google).

---

## Step 1: Turn On Your Free Support & Privacy Policy URLs (2 Minutes)

Both Apple and Google **require** a live public HTTPS Privacy Policy URL before you can submit. Your repo already includes `docs/index.html` and `docs/privacy-policy.html`!

1. Open https://github.com/MattBriselli/GamerBoy/settings/pages
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Select branch **`main`** and folder **`/docs`**, then click **Save**.
4. Within ~60 seconds, your two store URLs will be live at:
   - **Support / Marketing URL**: `https://mattbriselli.github.io/GamerBoy/`
   - **Privacy Policy URL**: `https://mattbriselli.github.io/GamerBoy/privacy-policy.html`

*(Note: For AdMob `app-ads.txt` root-domain verification later, create a tiny public repo named `MattBriselli.github.io` containing your 1-line `app-ads.txt` file so it resolves at the root domain `https://mattbriselli.github.io/app-ads.txt`, and use `https://mattbriselli.github.io` as your Developer Website in the stores.)*

---

## Step 2: Enroll in Apple & Google Developer Programs (Start First — 24–48h Approval)

1. **Apple Developer Program ($99/year — iOS & iPadOS App Store)**:
   - Enroll at https://developer.apple.com/programs/enroll/ (easiest via the **Apple Developer** app on your iPhone/Mac using your Apple ID).
   - Individual accounts typically approve within 24 hours.
2. **Google Play Console ($25 one-time fee — Android Google Play Store)**:
   - Register at https://play.google.com/console/signup as a **Personal** (or Organization) developer account and complete identity verification.
   - *Important Google Play Note:* New personal Google Play developer accounts must run a **14-day closed test with at least 12 opted-in testers** before Google unlocks Production publishing—invite friends/family emails to your Closed Testing track as soon as your first `.aab` uploads!
3. **Expo Account (Free — Cloud iOS & Android Builder)**:
   - Sign up free at https://expo.dev/signup.

---

## Step 3: Create Your Google AdMob Account & Ad Units (10 Minutes)

1. Sign up free at https://admob.google.com using your Google account and enter your payment/tax details so payouts are enabled.
2. In the left sidebar, click **Apps → Add app**:
   - Create App #1: Platform **iOS**, "Is the app listed on a supported app store?" → **No** → Name: `GamerBoy Solitaire`.
   - Copy your **iOS App ID** (looks like `ca-app-pub-1234567890123456~1111111111`).
   - Inside that iOS app, click **Ad units → Add ad unit → Banner**, name it `Bottom Menu Banner`, and copy your **iOS Banner Ad Unit ID** (looks like `ca-app-pub-1234567890123456/2222222222`).
3. Repeat **Apps → Add app** for **Android**:
   - Copy your **Android App ID** (`ca-app-pub-1234567890123456~3333333333`).
   - Create a **Banner** ad unit and copy your **Android Banner Ad Unit ID** (`ca-app-pub-1234567890123456/4444444444`).
4. Paste your **App IDs** into `apps/solitaire/app.json` (replacing the two Google sample IDs under `"react-native-google-mobile-ads"`):
   ```json
   [
     "react-native-google-mobile-ads",
     {
       "androidAppId": "ca-app-pub-1234567890123456~3333333333",
       "iosAppId": "ca-app-pub-1234567890123456~1111111111",
       "delayAppMeasurementInit": true,
       "userTrackingUsageDescription": "This identifier will be used to deliver relevant, non-intrusive banner ads that keep GamerBoy Solitaire free to play."
     }
   ]
   ```
5. Also in AdMob → **Privacy & messaging → European regulations**, click **Create message** so European/UK players automatically see Google's certified GDPR consent prompt.

---

## Step 4: Link Expo EAS & Add Your Banner Unit IDs

Run these commands inside `/Users/M/Dev/GamerBoy/apps/solitaire`:

```bash
# 1. Log into your free Expo account and link the project
npx eas-cli@latest login
npx eas-cli@latest init

# 2. Save your production AdMob Banner, Interstitial & Rewarded Unit IDs into EAS Cloud Environment Variables
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "ca-app-pub-XXXX/1111" --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "ca-app-pub-XXXX/2222" --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID --value "ca-app-pub-XXXX/3333" --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID --value "ca-app-pub-XXXX/4444" --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID --value "ca-app-pub-XXXX/5555" --environment production --visibility plaintext
npx eas-cli@latest env:create --name EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID --value "ca-app-pub-XXXX/6666" --environment production --visibility plaintext
```

*(Remember to commit and push `app.json` after `eas init` adds your `projectId`!)*

---

## Step 5: Build Signed Store Binaries in the Cloud

EAS automatically generates and manages your iOS Distribution Certificate, Provisioning Profile, and Android Upload Keystore—no manual keychain setup needed!

```bash
# Build signed iOS App Store binary (.ipa) — prompts for your Apple ID once
npx eas-cli@latest build --platform ios --profile production

# Build signed Android Play Store App Bundle (.aab)
npx eas-cli@latest build --platform android --profile production
```

---

## Step 6: Submit & Fill Out Store Listings (Copy-Paste Cheat Sheet)

### Submit to Apple App Store Connect / TestFlight
```bash
npx eas-cli@latest submit --platform ios --profile production
```
Then open https://appstoreconnect.apple.com → **Apps → GamerBoy Solitaire**:

- **Name**: `GamerBoy Solitaire` *(or `GamerBoy Solitaire: Klondike` if taken)*
- **Subtitle (30 chars max)**: `Classic Klondike Card Game`
- **Primary Category**: `Games` → Subcategories: `Card`, `Puzzle`
- **Keywords (100 chars max)**: `solitaire,klondike,cards,patience,classic,daily,card game,offline,winning deals,brain,relaxing`
- **Description (Copy-Paste for both Apple & Google)**:
  > Enjoy timeless Klondike Solitaire crafted with crisp modern cards, smooth animations, and effortless controls.
  >
  > FEATURES:
  > • Verified Winning Deals — Play 100% solvable shuffles anytime in Draw 1 or Draw 3 mode.
  > • Daily Challenges — Solve the same seeded board as players around the world each day and earn monthly crowns.
  > • Dual Controls — Tap once for smart auto-moves or smoothly drag single cards and stacks.
  > • Unlimited Undo, Smart Hints & Cascading Auto-Complete.
  > • Three Custom Table Themes — Emerald Felt, Midnight Slate (Dark Mode), and Warm Ivory.
  > • Automatic Mid-Game Save & Offline Play — Pick up right where you left off anytime.
- **Age Rating**: Select **None / No** for all violence, gambling (note: standard Solitaire has **no** simulated casino betting/wagering—select **No** to Simulated Gambling so it receives a **4+ / Everyone** rating!).
- **App Privacy ("Nutrition Labels")**:
  - Do you or your third-party partners collect data? **Yes**
  - Check: **Identifiers → Device ID** (Used for *Third-Party Advertising* + *Tracking* via ATT), **Location → Coarse Location** (*Third-Party Advertising*), **Usage Data → Advertising Data** (*Third-Party Advertising*), **Diagnostics → Crash Data / Performance Data** (*Analytics / App Functionality*).

### Upload First Release to Google Play Console
1. Open https://play.google.com/console → **Create app** (`GamerBoy Solitaire`, Game, Free, Contains Ads = **Yes**).
2. Complete the **App Content** checklists:
   - **Privacy Policy**: `https://mattbriselli.github.io/GamerBoy/privacy-policy.html`
   - **Ads**: Yes, my app contains ads.
   - **Target Audience**: Select **13+** (`13-15`, `16-17`, `18 and over`) so you do not have to enroll in the strict "Designed for Families / Under-13 Teacher Approved" program.
   - **Data Safety**: Data collected/shared by SDKs → check **Device or other IDs**, **Approximate location**, **App interactions**, and **Crash logs** (all marked *Ephemeral / Advertising or Marketing / Analytics*).
3. Download the `.aab` URL printed by `eas build --platform android` and drag-and-drop it into **Testing → Closed testing** (or **Production** once unlocked). For all future updates after the first upload, you can run `npx eas-cli@latest submit --platform android --profile production`!
