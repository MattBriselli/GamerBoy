# GamerBoy Studio Monorepo

A shared-package **React Native + Expo (TypeScript)** monorepo for launching standalone mobile games on **iOS** and **Android** with shared monetization, themes, card UI, and multiplayer foundations.

## Workspace Layout

```text
GamerBoy/
├── packages/
│   ├── core/          # @gamerboy/core — themes, haptics, AsyncStorage helpers, deterministic PRNG
│   ├── card-kit/      # @gamerboy/card-kit — 52-card types, deck utils, Modern Classic PlayingCard
│   ├── monetization/  # @gamerboy/monetization — AdMob (Banner, Capped Interstitial, Rewarded), ATT/UMP, Cross-Promo
│   └── multiplayer/   # @gamerboy/multiplayer — game-agnostic rooms, invite codes, quick-match & sync contracts
├── apps/
│   └── solitaire/     # @gamerboy/solitaire — Standalone Klondike Solitaire app (com.gamerboy.solitaire)
└── docs/              # GitHub Pages Support, Privacy Policy & app-ads.txt
```

## Quick Start

```bash
# Install workspace dependencies
npm install

# Run checks across the entire studio monorepo
npm run lint
npm run typecheck
npm test

# Launch GamerBoy Solitaire (Web / iOS / Android)
npm run web
npm run ios
npm run android
```

See [STORE_SUBMISSION_GUIDE.md](./STORE_SUBMISSION_GUIDE.md) for configuring production AdMob IDs and submitting apps to the Apple App Store and Google Play Store.
