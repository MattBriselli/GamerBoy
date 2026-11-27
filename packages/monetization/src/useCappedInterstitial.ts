import { useCallback, useRef } from 'react';
import type { AdUnitConfig } from './config';

export interface CappedInterstitialOptions {
  /** Number of completed/new deals between interstitials (default: 3) */
  dealsPerAd?: number;
  /** Minimum cooldown between interstitials in ms (default: 90s) */
  minIntervalMs?: number;
}

export interface CappedInterstitialHandle {
  /**
   * Call at natural transition breaks (e.g. starting a fresh deal after finishing/playing).
   * Returns true if an interstitial was shown, false if skipped by cap or unavailable.
   */
  maybeShowBetweenDeals: () => Promise<boolean>;
}

/**
 * Web / Expo Go safe fallback: tracks frequency cap cleanly without blocking gameplay.
 */
export function useCappedInterstitial(
  _config: AdUnitConfig,
  options: CappedInterstitialOptions = {}
): CappedInterstitialHandle {
  const dealsPerAd = options.dealsPerAd ?? 3;
  const minIntervalMs = options.minIntervalMs ?? 90_000;

  const dealCounterRef = useRef(0);
  const lastShownAtRef = useRef(0);

  const maybeShowBetweenDeals = useCallback(async () => {
    dealCounterRef.current += 1;
    const now = Date.now();
    const enoughDeals = dealCounterRef.current >= dealsPerAd;
    const cooledDown = now - lastShownAtRef.current >= minIntervalMs;

    if (enoughDeals && cooledDown) {
      dealCounterRef.current = 0;
      lastShownAtRef.current = now;
      return false;
    }
    return false;
  }, [dealsPerAd, minIntervalMs]);

  return { maybeShowBetweenDeals };
}
