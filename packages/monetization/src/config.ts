import { Platform } from 'react-native';

export interface PlatformAdUnits {
  ios?: string;
  android?: string;
}

export interface AdUnitConfig {
  banner: PlatformAdUnits;
  interstitial: PlatformAdUnits;
  rewarded: PlatformAdUnits;
}

/**
 * Official Google AdMob test unit IDs — automatically used whenever __DEV__ === true
 * or when a production unit ID has not yet been supplied.
 */
export const GOOGLE_TEST_UNITS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2435281174',
    android: 'ca-app-pub-3940256099942544/9214589741',
    default: 'ca-app-pub-3940256099942544/6300978111',
  })!,
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
    default: 'ca-app-pub-3940256099942544/1033173712',
  })!,
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
    default: 'ca-app-pub-3940256099942544/5224354917',
  })!,
};

export function resolveAdUnitId(
  format: keyof AdUnitConfig,
  config: AdUnitConfig
): string {
  if (__DEV__) {
    return GOOGLE_TEST_UNITS[format];
  }
  const units = config[format];
  if (Platform.OS === 'ios' && units.ios) {
    return units.ios;
  }
  if (Platform.OS === 'android' && units.android) {
    return units.android;
  }
  return GOOGLE_TEST_UNITS[format];
}

export interface StudioGameEntry {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iosUrl?: string;
  androidUrl?: string;
  status: 'live' | 'coming_soon';
}

/**
 * Shared catalog for free cross-promotion across all GamerBoy Studio apps.
 * Add each new standalone app here once its store listing is live!
 */
export const STUDIO_GAMES: StudioGameEntry[] = [
  {
    id: 'solitaire',
    name: 'GamerBoy Solitaire',
    tagline: 'Modern Classic Klondike & Daily Crowns',
    icon: '♠️',
    status: 'live',
  },
  {
    id: 'freecell',
    name: 'GamerBoy FreeCell',
    tagline: 'Pure-skill open-face card puzzles',
    icon: '♦️',
    status: 'coming_soon',
  },
  {
    id: 'spider',
    name: 'GamerBoy Spider',
    tagline: '1, 2 & 4-suit Spider Solitaire',
    icon: '🕷️',
    status: 'coming_soon',
  },
];
