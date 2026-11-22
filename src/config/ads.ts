import { Platform } from 'react-native';

/**
 * Central AdMob Banner configuration.
 *
 * - During development (__DEV__ === true), Google's official Adaptive Banner Test ID
 *   is ALWAYS used so your AdMob account is protected from accidental invalid clicks.
 * - For App Store / Google Play production builds, set:
 *     EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY
 *     EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
 *   in your `.env` or EAS Secrets (and update `iosAppId` / `androidAppId` in `app.json`).
 */
export const GOOGLE_TEST_ADAPTIVE_BANNER_ID = Platform.select({
  ios: 'ca-app-pub-3940256099942544/2435281174',
  android: 'ca-app-pub-3940256099942544/9214589741',
  default: 'ca-app-pub-3940256099942544/6300978111',
})!;

export function getBannerAdUnitId(): string {
  if (__DEV__) {
    return GOOGLE_TEST_ADAPTIVE_BANNER_ID;
  }
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || GOOGLE_TEST_ADAPTIVE_BANNER_ID;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || GOOGLE_TEST_ADAPTIVE_BANNER_ID;
  }
  return GOOGLE_TEST_ADAPTIVE_BANNER_ID;
}
