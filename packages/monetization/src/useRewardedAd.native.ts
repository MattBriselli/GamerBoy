import { useCallback, useEffect, useRef, useState } from 'react';
import { AdUnitConfig, resolveAdUnitId } from './config';
import {
  ensureAdsInitialized,
  GmaModule,
  isNativeAdMobAvailable,
} from './sdk.native';
import type { RewardedAdHandle } from './useRewardedAd';

export type { RewardedAdHandle };

type RewardedInstance = ReturnType<GmaModule['RewardedAd']['createForAdRequest']>;

export function useRewardedAd(config: AdUnitConfig): RewardedAdHandle {
  const [isReady, setIsReady] = useState(!isNativeAdMobAvailable);
  const [isShowing, setIsShowing] = useState(false);

  const adRef = useRef<RewardedInstance | null>(null);
  const pendingRewardRef = useRef<(() => void) | null>(null);
  const earnedDuringShowRef = useRef(false);
  const closeResolverRef = useRef<((earned: boolean) => void) | null>(null);

  useEffect(() => {
    if (!isNativeAdMobAvailable) return;
    let active = true;
    const unsubs: (() => void)[] = [];

    ensureAdsInitialized()
      .then(({ personalized, gma }) => {
        if (!active) return;
        const unitId = __DEV__
          ? gma.TestIds.REWARDED
          : resolveAdUnitId('rewarded', config);

        const rewarded = gma.RewardedAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: !personalized,
        });
        adRef.current = rewarded;

        unsubs.push(
          rewarded.addAdEventListener(gma.RewardedAdEventType.LOADED, () => {
            if (active) setIsReady(true);
          })
        );
        unsubs.push(
          rewarded.addAdEventListener(gma.RewardedAdEventType.EARNED_REWARD, () => {
            earnedDuringShowRef.current = true;
            pendingRewardRef.current?.();
            pendingRewardRef.current = null;
          })
        );
        unsubs.push(
          rewarded.addAdEventListener(gma.AdEventType.CLOSED, () => {
            if (active) {
              setIsShowing(false);
              setIsReady(false);
            }
            const earned = earnedDuringShowRef.current;
            earnedDuringShowRef.current = false;
            pendingRewardRef.current = null;
            closeResolverRef.current?.(earned);
            closeResolverRef.current = null;
            // Preload next rewarded video
            rewarded.load();
          })
        );
        unsubs.push(
          rewarded.addAdEventListener(gma.AdEventType.ERROR, () => {
            if (active) {
              setIsShowing(false);
              setIsReady(false);
            }
            pendingRewardRef.current = null;
            closeResolverRef.current?.(false);
            closeResolverRef.current = null;
          })
        );

        rewarded.load();
      })
      .catch(() => {});

    return () => {
      active = false;
      unsubs.forEach((u) => u());
      adRef.current = null;
    };
  }, [config]);

  const showRewarded = useCallback(async (onEarned: () => void) => {
    if (!isNativeAdMobAvailable) {
      setIsShowing(true);
      await new Promise((r) => setTimeout(r, 350));
      setIsShowing(false);
      onEarned();
      return true;
    }

    const ad = adRef.current;
    if (!ad || !isReady) {
      return false;
    }

    earnedDuringShowRef.current = false;
    pendingRewardRef.current = onEarned;
    setIsShowing(true);

    return new Promise<boolean>((resolve) => {
      closeResolverRef.current = resolve;
      ad.show().catch(() => {
        setIsShowing(false);
        pendingRewardRef.current = null;
        closeResolverRef.current = null;
        resolve(false);
      });
    });
  }, [isReady]);

  return { isReady, isShowing, showRewarded };
}
