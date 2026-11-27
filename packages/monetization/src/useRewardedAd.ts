import { useCallback, useState } from 'react';
import type { AdUnitConfig } from './config';

export interface RewardedAdHandle {
  /** True when a rewarded video ad (or dev preview) is ready to watch */
  isReady: boolean;
  /** True while the rewarded ad is currently playing */
  isShowing: boolean;
  /**
   * Launches an opt-in rewarded video ad and invokes `onEarned` only after
   * the user completes the reward criteria.
   */
  showRewarded: (onEarned: () => void) => Promise<boolean>;
}

/**
 * Web / Expo Go safe fallback: simulates a brief opt-in reward grant so the
 * full UX can be tested seamlessly outside a native store build.
 */
export function useRewardedAd(_config: AdUnitConfig): RewardedAdHandle {
  const [isShowing, setIsShowing] = useState(false);

  const showRewarded = useCallback(async (onEarned: () => void) => {
    setIsShowing(true);
    await new Promise((r) => setTimeout(r, 350));
    setIsShowing(false);
    onEarned();
    return true;
  }, []);

  return { isReady: true, isShowing, showRewarded };
}
