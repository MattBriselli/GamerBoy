import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { getBannerAdUnitId } from '../config/ads';
import { AdBannerPreview as FallbackBanner, AdBannerProps } from './AdBannerPreview';

export type { AdBannerProps };

type GmaModule = typeof import('react-native-google-mobile-ads');

// True in EAS / Native Dev Client builds; false in stock Expo Go
const isNativeAdMobAvailable = Boolean(
  TurboModuleRegistry.get('RNGoogleMobileAdsModule')
);

let initializationPromise: Promise<{ personalized: boolean; gma: GmaModule }> | null = null;

async function ensureAdsInitialized(): Promise<{
  personalized: boolean;
  gma: GmaModule;
}> {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    let personalized = true;

    // 1. iOS App Tracking Transparency (ATT) prompt BEFORE initializing Mobile Ads SDK
    if (Platform.OS === 'ios') {
      try {
        const current = await TrackingTransparency.getTrackingPermissionsAsync();
        if (current.status === 'undetermined') {
          const requested = await TrackingTransparency.requestTrackingPermissionsAsync();
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
      // UMP form not configured in AdMob console yet; safe to proceed
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

export function AdBanner({ theme, placement = 'menu' }: AdBannerProps) {
  const [sdkState, setSdkState] = useState<{
    ready: boolean;
    personalized: boolean;
    gma: GmaModule | null;
    failed: boolean;
  }>({ ready: false, personalized: false, gma: null, failed: false });

  useEffect(() => {
    if (!isNativeAdMobAvailable) return;
    let mounted = true;
    ensureAdsInitialized()
      .then(({ personalized, gma }) => {
        if (mounted) {
          setSdkState({ ready: true, personalized, gma, failed: false });
        }
      })
      .catch(() => {
        if (mounted) {
          setSdkState({ ready: false, personalized: false, gma: null, failed: true });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isNativeAdMobAvailable || sdkState.failed) {
    return <FallbackBanner theme={theme} placement={placement} />;
  }

  if (!sdkState.ready || !sdkState.gma) {
    return (
      <View
        style={[
          styles.nativeContainer,
          { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder },
        ]}
      />
    );
  }

  const { BannerAd: NativeBannerAd, BannerAdSize, TestIds } = sdkState.gma;
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : getBannerAdUnitId();

  return (
    <View
      style={[
        styles.nativeContainer,
        { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder },
      ]}
    >
      <NativeBannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: !sdkState.personalized,
        }}
        onAdFailedToLoad={() => {
          setSdkState((prev) => ({ ...prev, failed: true }));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    width: '100%',
    minHeight: 58,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
