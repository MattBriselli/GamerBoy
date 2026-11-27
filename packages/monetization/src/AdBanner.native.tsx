import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdBannerPreview as FallbackBanner, AdBannerProps } from './AdBannerPreview';
import { resolveAdUnitId } from './config';
import {
  ensureAdsInitialized,
  GmaModule,
  isNativeAdMobAvailable,
} from './sdk.native';

export type { AdBannerProps };

export function AdBanner({
  config,
  theme,
  placement = 'menu',
  compact = false,
}: AdBannerProps) {
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
          setSdkState({
            ready: false,
            personalized: false,
            gma: null,
            failed: true,
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!isNativeAdMobAvailable || sdkState.failed) {
    return (
      <FallbackBanner theme={theme} placement={placement} compact={compact} />
    );
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
  const unitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : resolveAdUnitId('banner', config);

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
    minHeight: 56,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
