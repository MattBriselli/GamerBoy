import { Platform, TurboModuleRegistry } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';

export type GmaModule = typeof import('react-native-google-mobile-ads');

// True in EAS / Native Dev Client builds; false in stock Expo Go
export const isNativeAdMobAvailable = Boolean(
  TurboModuleRegistry.get('RNGoogleMobileAdsModule')
);

let initializationPromise: Promise<{
  personalized: boolean;
  gma: GmaModule;
}> | null = null;

export async function ensureAdsInitialized(): Promise<{
  personalized: boolean;
  gma: GmaModule;
}> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    let personalized = true;

    // 1. Request iOS App Tracking Transparency (ATT) BEFORE initializing AdMob
    if (Platform.OS === 'ios') {
      try {
        const current = await TrackingTransparency.getTrackingPermissionsAsync();
        if (current.status === 'undetermined') {
          const requested =
            await TrackingTransparency.requestTrackingPermissionsAsync();
          personalized = requested.status === 'granted';
        } else {
          personalized = current.status === 'granted';
        }
      } catch {
        personalized = false;
      }
    }

    // 2. Dynamically load & initialize Google Mobile Ads v17 SDK
    const gma = await import('react-native-google-mobile-ads');
    const mobileAds = gma.default;

    try {
      await gma.AdsConsent.gatherConsent();
    } catch {
      // UMP form not configured yet; safe to proceed
    }

    await mobileAds().setRequestConfiguration({
      maxAdContentRating: gma.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });

    await mobileAds().initialize();
    return { personalized, gma };
  })();

  return initializationPromise;
}
