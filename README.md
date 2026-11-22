# GamerBoy Solitaire

A **Modern Classic** Klondike Solitaire mobile game built with **React Native + Expo (TypeScript)** for **iOS** and **Android**, monetized with **Google AdMob Anchored Adaptive Banner Ads**.

## Features

- **Klondike Solitaire (Draw 1 & Draw 3)** with standard scoring, move counter, and active play timer.
- **Dual Controls**: Smart single-tap auto-move **plus** smooth 60fps single-card and multi-card stack drag-and-drop.
- **Guaranteed Winning Deals**: Built-in heuristic Klondike solver + verified seed pool so every "Winning Deal" is 100% solvable.
- **Daily Challenge & Monthly Crowns**: Deterministic `YYYY-MM-DD` solvable daily boards, interactive monthly calendar, and crown tracker.
- **Unlimited Undo, Smart Hints & Cascading Auto-Complete**.
- **Three Table Themes**: *Emerald Felt*, *Midnight Slate (Dark)*, and *Warm Ivory (Light)*.
- **Automatic Local Persistence**: Mid-game state, lifetime stats, streaks, and settings auto-saved via `AsyncStorage`.
- **Store-Ready AdMob Integration**: Native `react-native-google-mobile-ads` v17 with iOS App Tracking Transparency (ATT), UMP consent hookup, safe-area separation, and Web/Expo Go preview fallback.

## Quick Start

```bash
# Run unit tests & TypeScript typecheck
npm test
npm run typecheck

# Launch interactive preview (Web / iOS / Android)
npm run web
npm run ios
npm run android
```

> **Note on Native AdMob Banners:** `react-native-google-mobile-ads` includes custom native iOS/Android code. On Web or stock Expo Go, `<AdBanner />` automatically renders a safe-area preview banner slot. To see live Google Test Banner ads on iOS Simulator or Android Emulator, build a native dev client (`npx expo run:ios` or `npx expo run:android`).

See [STORE_SUBMISSION_GUIDE.md](./STORE_SUBMISSION_GUIDE.md) for configuring production AdMob IDs and submitting to the App Store and Google Play.
