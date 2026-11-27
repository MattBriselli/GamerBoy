export const isNativeAdMobAvailable = false;

export async function ensureAdsInitialized(): Promise<{
  personalized: boolean;
}> {
  return { personalized: false };
}
