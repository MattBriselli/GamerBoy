import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DealType, DrawMode } from '../engine/types';
import { AppTheme } from '../theme/themes';

export interface TopHudProps {
  theme: AppTheme;
  score: number;
  moves: number;
  elapsedSeconds: number;
  dealType: DealType;
  drawMode: DrawMode;
  dailyDate?: string;
  onBackToMenu: () => void;
  onOpenStats: () => void;
}

export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TopHud({
  theme,
  score,
  moves,
  elapsedSeconds,
  dealType,
  drawMode,
  dailyDate,
  onBackToMenu,
  onOpenStats,
}: TopHudProps) {
  const modeLabel =
    dealType === 'daily'
      ? `DAILY • ${dailyDate?.slice(5) ?? ''}`
      : dealType === 'winning'
      ? 'WINNING'
      : 'CLASSIC';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.surfaceBorder,
        },
      ]}
    >
      <View style={styles.leftGroup}>
        <Pressable
          onPress={onBackToMenu}
          style={({ pressed }) => [
            styles.menuButton,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.surfaceBorder,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back to main menu"
        >
          <Text style={[styles.menuButtonText, { color: theme.textPrimary }]}>
            ‹ Menu
          </Text>
        </Pressable>

        <View
          style={[
            styles.modeBadge,
            { backgroundColor: theme.accentSoft, borderColor: theme.surfaceBorder },
          ]}
        >
          <Text style={[styles.modeBadgeText, { color: theme.accent }]}>
            {modeLabel} • D{drawMode}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onOpenStats}
        style={styles.statsGroup}
        accessibilityRole="button"
        accessibilityLabel="View player statistics"
      >
        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>SCORE</Text>
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{score}</Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>TIME</Text>
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
            {formatDuration(elapsedSeconds)}
          </Text>
        </View>
        <View style={styles.metricCol}>
          <Text style={[styles.metricLabel, { color: theme.textMuted }]}>MOVES</Text>
          <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{moves}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  menuButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metricCol: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
