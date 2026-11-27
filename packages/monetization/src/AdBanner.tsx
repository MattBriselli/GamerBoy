import React from 'react';
import { AdBannerPreview, AdBannerProps } from './AdBannerPreview';

export type { AdBannerProps };

export function AdBanner(props: AdBannerProps) {
  return (
    <AdBannerPreview
      theme={props.theme}
      placement={props.placement}
      compact={props.compact}
    />
  );
}
