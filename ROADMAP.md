# GamerBoy Studio — Roadmap & Reminders

Living backlog. Agents: surface the open items here at the end of each GamerBoy session so nothing gets dropped.

## 🚀 Launch: GamerBoy Solitaire (Android first)
- [x] Google Play Console account paid ($25, 2026-11-27 — logged in God Mode ledger)
- [x] Expo account + `eas init` (project `@matt-breezy/gamerboy`)
- [x] First production Android build (`.aab`, versionCode 2, test ads)
- [x] Feature graphic (`apps/solitaire/store/feature-graphic.png`)
- [x] Phone screenshots (`apps/solitaire/store/screenshots/`)
- [ ] Google identity verification approved (+ Android device verification in Play Console app)
- [ ] Recruit 12 closed-test testers (Gmail addresses)
- [ ] Create app in Play Console, fill listing / content rating / Data Safety / ads declaration
- [ ] Upload `.aab` to Closed testing, invite testers → start 14-day clock
- [ ] Apply for production access after 14 days
- [ ] Decide feature graphic tagline ("Every deal winnable" vs. "Winnable deals on demand")

## 💰 Monetization (AdMob)
- [ ] Create AdMob account + payments/tax profile
- [ ] Add Solitaire (Android) as unpublished app; create banner, interstitial, rewarded units
- [ ] Set the `EXPO_PUBLIC_ADMOB_*` EAS env vars + replace test App IDs in `apps/solitaire/app.json` (switch on for production, keep test ads for closed test)
- [ ] After Play listing is live: link app to store in AdMob, publish `docs/app-ads.txt` with real pub ID
- [ ] GDPR/UK consent message in AdMob Privacy & messaging

## 🍎 iOS (later — after Android ad data looks good)
- [ ] Apple Developer Program ($99/yr) — log in God Mode ledger when paid
- [ ] iOS build + App Store Connect listing + TestFlight

## ✨ Solitaire features
- [ ] Achievements / win-streak badges
- [ ] Daily streak reminders (local notifications)
- [ ] More card backs & felts (rewarded-ad unlocks)
- [ ] Same-Seed Race multiplayer (needs `@gamerboy/multiplayer` transport)

## 🃏 New games (each its own app, reusing packages)
- [ ] Game #2: GamerBoy FreeCell (`apps/freecell`)
- [ ] Game #3: GamerBoy Spider (`apps/spider`)
- [ ] Turn on cross-promo shelf entries as each ships

## 🔧 Shared platform
- [ ] `@gamerboy/multiplayer` transport implementation (Cloudflare Durable Objects)
- [ ] Revenue connector: AdMob → God Mode ledger income

## 📣 Portfolio
- [ ] Showcase GamerBoy on the Personal Website (`index.html`, `llms.txt`, `resume.json`)
