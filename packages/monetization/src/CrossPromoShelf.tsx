import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '@gamerboy/core';
import { STUDIO_GAMES, StudioGameEntry } from './config';

export interface CrossPromoShelfProps {
  currentGameId: string;
  theme: AppTheme;
}

export function CrossPromoShelf({ currentGameId, theme }: CrossPromoShelfProps) {
  const otherGames = STUDIO_GAMES.filter((g) => g.id !== currentGameId);
  if (otherGames.length === 0) return null;

  const handleOpenGame = (game: StudioGameEntry) => {
    const url = Platform.OS === 'ios' ? game.iosUrl : game.androidUrl;
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
      ]}
    >
      <Text style={[styles.eyebrow, { color: theme.accent }]}>
        MORE FROM GAMERBOY STUDIO
      </Text>
      <View style={styles.list}>
        {otherGames.map((item) => {
          const isLive = item.status === 'live' && Boolean(item.iosUrl || item.androidUrl);
          return (
            <Pressable
              key={item.id}
              disabled={!isLive}
              onPress={() => handleOpenGame(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.surfaceBorder,
                  opacity: isLive ? (pressed ? 0.8 : 1) : 0.78,
                },
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={styles.info}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.tagline, { color: theme.textMuted }]}>
                  {item.tagline}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isLive ? theme.accent : theme.slotBg },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isLive ? theme.accentText : theme.textSecondary },
                  ]}
                >
                  {isLive ? 'GET' : 'SOON'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
