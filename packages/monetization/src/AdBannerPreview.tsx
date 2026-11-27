import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '@gamerboy/core';
import type { AdUnitConfig } from './config';

export interface AdBannerProps {
  config: AdUnitConfig;
  theme: AppTheme;
  placement?: string;
  compact?: boolean;
}

export function AdBannerPreview({
  theme,
  placement = 'menu',
  compact = false,
}: Pick<AdBannerProps, 'theme' | 'placement' | 'compact'>) {
  return (
    <View
      style={[
        styles.wrapper,
        compact && styles.wrapperCompact,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.surfaceBorder,
        },
      ]}
      accessibilityLabel={`Sponsored banner slot (${placement})`}
    >
      <View
        style={[
          styles.previewBox,
          compact && styles.previewBoxCompact,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: theme.surfaceBorder,
          },
        ]}
      >
        <View style={[styles.adBadge, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.adBadgeText, { color: theme.accent }]}>AD</Text>
        </View>
        <View style={styles.copyCol}>
          <Text
            style={[styles.headline, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            AdMob Adaptive Banner • {placement}
          </Text>
          {!compact && (
            <Text
              style={[styles.subline, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              Live native ads render automatically in iOS & Android builds
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapperCompact: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  previewBox: {
    width: '100%',
    maxWidth: 468,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewBoxCompact: {
    height: 46,
  },
  adBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  copyCol: {
    flex: 1,
  },
  headline: {
    fontSize: 12,
    fontWeight: '600',
  },
  subline: {
    fontSize: 10,
    marginTop: 1,
  },
});
