# App Store & Google Play Submission Guide (AdMob Edition)

This checklist walks through taking **GamerBoy Solitaire** from local development to live ad-monetized apps on the **Apple App Store** and **Google Play Store**.

---

## 1. Create Your Google AdMob Account & Ad Units

1. Sign in at https://admob.google.com and create **two apps** (one for **iOS**, one for **Android**).
2. Copy both **App IDs** (`ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`) and replace the sample test App IDs in `app.json`:
   ```json
   [
     "react-native-google-mobile-ads",
     {
       "androidAppId": "ca-app-pub-YOUR_ACCOUNT~ANDROID_APP_ID",
       "iosAppId": "ca-app-pub-YOUR_ACCOUNT~IOS_APP_ID",
       "delayAppMeasurementInit": true,
       "userTrackingUsageDescription": "This identifier will be used to deliver relevant, non-intrusive banner ads that keep GamerBoy Solitaire free to play."
     }
   ]
   ```
3. Inside each AdMob app, create one **Banner** ad unit (`Anchored Adaptive Banner` uses standard Banner ad units).
4. Add both Banner Ad Unit IDs (`ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`) as **EAS Environment Variables** (or in `.env` locally):
   - `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID`
   - `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID`
5. Set up an **`app-ads.txt`** file on your developer website root (`https://yourdomain.com/app-ads.txt`) containing the snippet provided in your AdMob dashboard -> *Apps -> View all apps -> app-ads.txt*. Both Apple and Google crawl your store Developer Website URL to verify `app-ads.txt` ownership!

---

## 2. Store Policy & Privacy Compliance (Already Wired in Code)

- **Accidental Click Protection**: AdMob Banners are rendered strictly inside bottom safe-area containers on **Menu, Daily Challenge, Victory, and Stats** screens—never adjacent to active card drag zones.
- **iOS App Tracking Transparency (ATT)**: `src/components/AdBanner.native.tsx` prompts ATT permission *before* initializing `mobileAds().initialize()` and automatically falls back to `requestNonPersonalizedAdsOnly: true` when declined.
- **European/GDPR Consent (UMP)**: `AdsConsent.gatherConsent()` runs before SDK initialization; configure your GDPR message in AdMob -> *Privacy & messaging* before launching in EEA/UK regions.
- **Hosted Privacy Policy URL**: Both stores require a public HTTPS Privacy Policy URL disclosing that Google AdMob collects Device Identifiers, Coarse IP Location, and Ad Interaction Diagnostics.

### Apple App Store Connect — App Privacy Answers
- **Data Used to Track You**: `Identifiers -> Device ID` (via ATT prompt for AdMob).
- **Data Linked to You**: None (all game saves & stats are stored 100% locally on-device).
- **Third-Party Advertising & Analytics**: Select `Device ID`, `Product Interaction (Ad taps/views)`, `Coarse Location (IP)`, `Crash/Diagnostics`.

### Google Play Console — Data Safety Answers
- **Advertising ID**: Declare **Yes** (used for Advertising/Marketing via Google Mobile Ads SDK).
- **Data Collected & Shared (Ephemeral/SDK)**: `Device or other IDs`, `Approximate location`, `App interactions (ad impressions)`, `Diagnostics`.

---

## 3. Building & Submitting with Expo EAS

1. Install EAS CLI and log in:
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   ```
2. Build production `.ipa` (iOS) and `.aab` (Android) binaries in the cloud:
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```
   *(Or build locally on macOS with Xcode using `npx expo run:ios --configuration Release`.)*
3. Submit directly to App Store Connect / TestFlight & Google Play Console:
   ```bash
   eas submit --platform ios --profile production
   eas submit --platform android --profile production
   ```
