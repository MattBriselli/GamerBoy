import type { AdUnitConfig } from '@gamerboy/monetization';

/**
 * AdMob Ad Unit configuration for GamerBoy Solitaire.
 * Each standalone app under `apps/` defines its own unit IDs while reusing
 * the shared @gamerboy/monetization SDK, consent, banner, interstitial, and rewarded hooks.
 */
export const SOLITAIRE_AD_UNITS: AdUnitConfig = {
  banner: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
  },
  interstitial: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
  },
  rewarded: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
  },
};
