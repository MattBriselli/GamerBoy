import { useCallback, useEffect, useRef } from 'react';
import { AdUnitConfig, resolveAdUnitId } from './config';
import {
  ensureAdsInitialized,
  GmaModule,
  isNativeAdMobAvailable,
} from './sdk.native';
import type {
  CappedInterstitialHandle,
  CappedInterstitialOptions,
} from './useCappedInterstitial';

export type { CappedInterstitialHandle, CappedInterstitialOptions };

type InterstitialInstance = ReturnType<GmaModule['InterstitialAd']['createForAdRequest']>;

export function useCappedInterstitial(
  config: AdUnitConfig,
  options: CappedInterstitialOptions = {}
): CappedInterstitialHandle {
  const dealsPerAd = options.dealsPerAd ?? 3;
  const minIntervalMs = options.minIntervalMs ?? 90_000;

  const dealCounterRef = useRef(0);
  const lastShownAtRef = useRef(0);
  const adRef = useRef<InterstitialInstance | null>(null);
  const loadedRef = useRef(false);
  const closeResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNativeAdMobAvailable) return;
    let active = true;
    const unsubs: (() => void)[] = [];

    ensureAdsInitialized()
      .then(({ personalized, gma }) => {
        if (!active) return;
        const unitId = __DEV__
          ? gma.TestIds.INTERSTITIAL
          : resolveAdUnitId('interstitial', config);
        if (!unitId) return; // format disabled in this build

        const interstitial = gma.InterstitialAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: !personalized,
        });

        adRef.current = interstitial;

        unsubs.push(
          interstitial.addAdEventListener(gma.AdEventType.LOADED, () => {
            loadedRef.current = true;
          })
        );
        unsubs.push(
          interstitial.addAdEventListener(gma.AdEventType.CLOSED, () => {
            loadedRef.current = false;
            closeResolverRef.current?.();
            closeResolverRef.current = null;
            // Warm the next interstitial for future natural breaks
            interstitial.load();
          })
        );
        unsubs.push(
          interstitial.addAdEventListener(gma.AdEventType.ERROR, () => {
            loadedRef.current = false;
            closeResolverRef.current?.();
            closeResolverRef.current = null;
          })
        );

        interstitial.load();
      })
      .catch(() => {});

    return () => {
      active = false;
      unsubs.forEach((u) => u());
      adRef.current = null;
      loadedRef.current = false;
    };
  }, [config]);

  const maybeShowBetweenDeals = useCallback(async () => {
    dealCounterRef.current += 1;
    const now = Date.now();
    const enoughDeals = dealCounterRef.current >= dealsPerAd;
    const cooledDown = now - lastShownAtRef.current >= minIntervalMs;

    if (!enoughDeals || !cooledDown) {
      return false;
    }

    const ad = adRef.current;
    if (!isNativeAdMobAvailable || !ad || !loadedRef.current) {
      return false;
    }

    dealCounterRef.current = 0;
    lastShownAtRef.current = now;

    return new Promise<boolean>((resolve) => {
      closeResolverRef.current = () => resolve(true);
      ad.show().catch(() => {
        closeResolverRef.current = null;
        loadedRef.current = false;
        resolve(false);
      });
    });
  }, [dealsPerAd, minIntervalMs]);

  return { maybeShowBetweenDeals };
}
