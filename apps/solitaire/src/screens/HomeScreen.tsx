import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayingCard } from '@gamerboy/card-kit';
import {
  AppTheme,
  formatLocalDate,
  THEME_LIST,
  ThemeId,
} from '@gamerboy/core';
import { AdBanner, CrossPromoShelf } from '@gamerboy/monetization';
import { formatDuration } from '../components/TopHud';
import { SOLITAIRE_AD_UNITS } from '../config/ads';
import { Card, DrawMode, GameState } from '../engine/types';
import { PlayerStats, UserSettings } from '../storage/persistence';

export interface HomeScreenProps {
  theme: AppTheme;
  settings: UserSettings;
  stats: PlayerStats;
  savedGame: GameState | null;
  onResumeGame: () => void;
  onStartWinningDeal: () => void;
  onStartStandardDeal: () => void;
  onOpenDailyChallenge: () => void;
  onOpenStats: () => void;
  onChangeDrawMode: (mode: DrawMode) => void;
  onChangeTheme: (themeId: ThemeId) => void;
}

const HERO_SPADE: Card = {
  id: 'hero-s1',
  suit: 'spades',
  rank: 1,
  color: 'black',
  faceUp: true,
};

const HERO_HEART: Card = {
  id: 'hero-h13',
  suit: 'hearts',
  rank: 13,
  color: 'red',
  faceUp: true,
};

export function HomeScreen({
  theme,
  settings,
  stats,
  savedGame,
  onResumeGame,
  onStartWinningDeal,
  onStartStandardDeal,
  onOpenDailyChallenge,
  onOpenStats,
  onChangeDrawMode,
  onChangeTheme,
}: HomeScreenProps) {
  const todayStr = formatLocalDate();
  const isTodayCompleted = stats.completedDailyDates.includes(todayStr);

  return (
    <LinearGradient colors={theme.tableGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header & Hero Cards */}
          <View style={styles.heroSection}>
            <View style={styles.heroCardsCluster}>
              <View style={{ transform: [{ rotate: '-10deg' }, { translateX: 8 }] }}>
                <PlayingCard card={HERO_SPADE} width={58} height={82} theme={theme} />
              </View>
              <View style={{ transform: [{ rotate: '9deg' }, { translateX: -8 }] }}>
                <PlayingCard card={HERO_HEART} width={58} height={82} theme={theme} />
              </View>
            </View>

            <Text style={[styles.brandEyebrow, { color: theme.accent }]}>
              GAMERBOY STUDIO
            </Text>
            <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
              Solitaire
            </Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              Modern Classic Klondike
            </Text>
          </View>

          {/* Resume Active Game Card */}
          {savedGame && !savedGame.isWon && (
            <Pressable
              onPress={onResumeGame}
              style={({ pressed }) => [
                styles.resumeCard,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.resumeHeader}>
                <Text style={[styles.resumeBadge, { color: theme.accent }]}>
                  ● IN PROGRESS
                </Text>
                <Text style={[styles.resumeMeta, { color: theme.textSecondary }]}>
                  {savedGame.dealType.toUpperCase()} • DRAW {savedGame.drawMode}
                </Text>
              </View>
              <View style={styles.resumeRow}>
                <View>
                  <Text style={[styles.resumeTitle, { color: theme.textPrimary }]}>
                    Continue Game
                  </Text>
                  <Text style={[styles.resumeSub, { color: theme.textMuted }]}>
                    Score {savedGame.score} • {savedGame.moves} moves •{' '}
                    {formatDuration(savedGame.elapsedSeconds)}
                  </Text>
                </View>
                <View
                  style={[styles.resumePlayPill, { backgroundColor: theme.accent }]}
                >
                  <Text style={[styles.resumePlayText, { color: theme.accentText }]}>
                    Resume ›
                  </Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* Primary Play CTAs */}
          <View style={styles.actionsStack}>
            <Pressable
              onPress={onStartWinningDeal}
              style={({ pressed }) => [
                styles.primaryCta,
                {
                  backgroundColor: theme.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View>
                <Text style={[styles.primaryCtaTitle, { color: theme.accentText }]}>
                  ✦ New Winning Deal
                </Text>
                <Text
                  style={[
                    styles.primaryCtaSub,
                    { color: theme.accentText, opacity: 0.8 },
                  ]}
                >
                  100% verified solvable shuffle • Draw {settings.drawMode}
                </Text>
              </View>
              <Text style={[styles.ctaChevron, { color: theme.accentText }]}>›</Text>
            </Pressable>

            {/* Daily Challenge Card */}
            <Pressable
              onPress={onOpenDailyChallenge}
              style={({ pressed }) => [
                styles.secondaryCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.cardLeftRow}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>👑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    Daily Challenge
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                    {isTodayCompleted
                      ? `Today's crown earned! (${stats.completedDailyDates.length} total)`
                      : `Play ${todayStr} seeded board`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    {
                      backgroundColor: isTodayCompleted
                        ? `${theme.success}25`
                        : theme.accentSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      { color: isTodayCompleted ? theme.success : theme.accent },
                    ]}
                  >
                    {isTodayCompleted ? 'CROWNED' : 'PLAY'}
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* Classic Shuffle + Stats Row */}
            <View style={styles.splitRow}>
              <Pressable
                onPress={onStartStandardDeal}
                style={({ pressed }) => [
                  styles.halfCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>🃏</Text>
                <Text style={[styles.halfCardTitle, { color: theme.textPrimary }]}>
                  Classic Deal
                </Text>
                <Text style={[styles.halfCardSub, { color: theme.textMuted }]}>
                  Pure random deck
                </Text>
              </Pressable>

              <Pressable
                onPress={onOpenStats}
                style={({ pressed }) => [
                  styles.halfCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.surfaceBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>🏆</Text>
                <Text style={[styles.halfCardTitle, { color: theme.textPrimary }]}>
                  Stats & Style
                </Text>
                <Text style={[styles.halfCardSub, { color: theme.textMuted }]}>
                  {stats.gamesWon} wins • Streak {stats.currentStreak}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Preferences Strip */}
          <View
            style={[
              styles.prefsPanel,
              {
                backgroundColor: theme.surface,
                borderColor: theme.surfaceBorder,
              },
            ]}
          >
            {/* Draw 1 / Draw 3 Toggle */}
            <View style={styles.prefRow}>
              <Text style={[styles.prefLabel, { color: theme.textSecondary }]}>
                Draw Mode
              </Text>
              <View
                style={[
                  styles.segmentedGroup,
                  { backgroundColor: theme.slotBg, borderColor: theme.surfaceBorder },
                ]}
              >
                {([1, 3] as DrawMode[]).map((mode) => {
                  const active = settings.drawMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => onChangeDrawMode(mode)}
                      style={[
                        styles.segmentBtn,
                        active && { backgroundColor: theme.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: active ? theme.accentText : theme.textSecondary },
                        ]}
                      >
                        Draw {mode}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Theme Swatches */}
            <View style={[styles.prefRow, { marginTop: 12 }]}>
              <Text style={[styles.prefLabel, { color: theme.textSecondary }]}>
                Table Felt
              </Text>
              <View style={styles.swatchRow}>
                {THEME_LIST.map((t) => {
                  const selected = settings.themeId === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => onChangeTheme(t.id)}
                      style={[
                        styles.themePill,
                        {
                          backgroundColor: t.tableGradient[0],
                          borderColor: selected ? theme.accent : t.surfaceBorder,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.themePillText,
                          { color: t.textPrimary },
                        ]}
                      >
                        {t.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Studio Cross-Promotion Shelf */}
          <CrossPromoShelf currentGameId="solitaire" theme={theme} />
        </ScrollView>

        {/* Bottom Safe-Area AdMob Adaptive Banner */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
          <AdBanner config={SOLITAIRE_AD_UNITS} theme={theme} placement="home" />
        </SafeAreaView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  heroCardsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  resumeCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 15,
    marginBottom: 14,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resumeBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  resumeMeta: {
    fontSize: 10,
    fontWeight: '700',
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  resumeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  resumePlayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  resumePlayText: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionsStack: {
    gap: 12,
  },
  primaryCta: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryCtaTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  primaryCtaSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  ctaChevron: {
    fontSize: 26,
    fontWeight: '700',
  },
  secondaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  halfCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  halfCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  prefsPanel: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  segmentedGroup: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
