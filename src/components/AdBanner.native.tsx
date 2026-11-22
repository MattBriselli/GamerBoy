import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { getBannerAdUnitId } from '../config/ads';
import { AppTheme } from '../theme/themes';
import { AdBannerPreview as FallbackBanner, AdBannerProps } from './AdBannerPreview';

export type { AdBannerProps };

// Check if native Google Mobile Ads binary is linked (true in EAS / Dev Client builds, false in Expo Go)
const isNativeAdMobAvailable = Boolean(
  TurboModuleRegistry.get('RNGoogleMobileAdsModule')
);

let initializationPromise: Promise<{ personalized: boolean }> | null = null;

async function ensureAdsInitialized(): Promise<{ personalized: boolean }> {
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

    // 2. Initialize Google Mobile Ads v17 SDK with child/family-safe G/PG content rating
    const gma = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
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
    return { personalized };
  })();

  return initializationPromise;
}

export function AdBanner({ theme, placement = 'menu' }: AdBannerProps) {
  const [sdkState, setSdkState] = useState<{
    ready: boolean;
    personalized: boolean;
    failed: boolean;
  }>({ ready: false, personalized: false, failed: false });

  useEffect(() => {
    if (!isNativeAdMobAvailable) return;
    let mounted = true;
    ensureAdsInitialized()
      .then(({ personalized }) => {
        if (mounted) setSdkState({ ready: true, personalized, failed: false });
      })
      .catch(() => {
        if (mounted) setSdkState({ ready: false, personalized: false, failed: true });
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isNativeAdMobAvailable || sdkState.failed) {
    return <FallbackBanner theme={theme} placement={placement} />;
  }

  if (!sdkState.ready) {
    return (
      <View
        style={[
          styles.nativeContainer,
          { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder },
        ]}
      />
    );
  }

  const { BannerAd: NativeBannerAd, BannerAdSize, TestIds } =
    require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

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
