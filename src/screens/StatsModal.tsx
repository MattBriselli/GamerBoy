import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdBanner } from '../components/AdBanner';
import { formatDuration } from '../components/TopHud';
import { DrawMode } from '../engine/types';
import { PlayerStats, UserSettings } from '../storage/persistence';
import { AppTheme, THEME_LIST, ThemeId } from '../theme/themes';

export interface StatsModalProps {
  visible: boolean;
  theme: AppTheme;
  settings: UserSettings;
  stats: PlayerStats;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onResetStats: () => void;
}

export function StatsModal({
  visible,
  theme,
  settings,
  stats,
  onClose,
  onUpdateSettings,
  onResetStats,
}: StatsModalProps) {
  const winRate =
    stats.gamesStarted > 0
      ? `${Math.round((stats.gamesWon / stats.gamesStarted) * 100)}%`
      : '—';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.tableGradient[1] },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              Stats & Table Style
            </Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.accent },
              ]}
            >
              <Text style={[styles.closeBtnText, { color: theme.accentText }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Lifetime Statistics Grid */}
            <Text style={[styles.sectionHeader, { color: theme.accent }]}>
              LIFETIME PERFORMANCE
            </Text>
            <View style={styles.statsGrid}>
              <StatTile
                label="Games Won"
                value={String(stats.gamesWon)}
                sub={`${stats.gamesStarted} started`}
                theme={theme}
              />
              <StatTile
                label="Win Rate"
                value={winRate}
                sub={`Streak ${stats.currentStreak}`}
                theme={theme}
              />
              <StatTile
                label="High Score"
                value={stats.highScore > 0 ? String(stats.highScore) : '—'}
                sub={`Best streak ${stats.bestStreak}`}
                theme={theme}
              />
              <StatTile
                label="Fastest Win"
                value={
                  stats.bestTimeSeconds !== null
                    ? formatDuration(stats.bestTimeSeconds)
                    : '—'
                }
                sub={
                  stats.fewestMoves !== null
                    ? `${stats.fewestMoves} fewest moves`
                    : 'No wins yet'
                }
                theme={theme}
              />
            </View>

            {/* Table Appearance */}
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.accent, marginTop: 22 },
              ]}
            >
              TABLE THEME
            </Text>
            <View style={styles.themeStack}>
              {THEME_LIST.map((item) => {
                const active = settings.themeId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onUpdateSettings({ themeId: item.id as ThemeId })}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: theme.surface,
                        borderColor: active ? theme.accent : theme.surfaceBorder,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themePreviewDot,
                        {
                          backgroundColor: item.tableGradient[0],
                          borderColor: item.accent,
                        },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.themeName, { color: theme.textPrimary }]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.themeSub, { color: theme.textMuted }]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                    {active && (
                      <Text style={{ color: theme.accent, fontWeight: '900' }}>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Gameplay Preferences */}
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.accent, marginTop: 22 },
              ]}
            >
              GAMEPLAY RULES
            </Text>
            <View
              style={[
                styles.settingsCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.surfaceBorder,
                },
              ]}
            >
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.settingTitle, { color: theme.textPrimary }]}
                  >
                    Default Draw Mode
                  </Text>
                  <Text
                    style={[styles.settingSub, { color: theme.textMuted }]}
                  >
                    Applies when starting your next deal
                  </Text>
                </View>
                <View
                  style={[
                    styles.segmented,
                    {
                      backgroundColor: theme.slotBg,
                      borderColor: theme.surfaceBorder,
                    },
                  ]}
                >
                  {([1, 3] as DrawMode[]).map((m) => {
                    const selected = settings.drawMode === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => onUpdateSettings({ drawMode: m })}
                        style={[
                          styles.segOption,
                          selected && { backgroundColor: theme.accent },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segText,
                            {
                              color: selected
                                ? theme.accentText
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          Draw {m}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.surfaceBorder },
                ]}
              />

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.settingTitle, { color: theme.textPrimary }]}
                  >
                    Tactile Haptics
                  </Text>
                  <Text
                    style={[styles.settingSub, { color: theme.textMuted }]}
                  >
                    Subtle vibration when snapping cards
                  </Text>
                </View>
                <Switch
                  value={settings.hapticsEnabled}
                  onValueChange={(val) =>
                    onUpdateSettings({ hapticsEnabled: val })
                  }
                  trackColor={{ false: '#64748B', true: theme.accent }}
                />
              </View>
            </View>

            {/* Reset Stats */}
            {stats.gamesStarted > 0 && (
              <Pressable onPress={onResetStats} style={styles.resetBtn}>
                <Text style={[styles.resetText, { color: theme.textMuted }]}>
                  Reset Lifetime Statistics
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
            <AdBanner theme={theme} placement="stats" />
          </SafeAreaView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function StatTile({
  label,
  value,
  sub,
  theme,
}: {
  label: string;
  value: string;
  sub: string;
  theme: AppTheme;
}) {
  return (
    <View
      style={[
        styles.statTile,
        { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
      ]}
    >
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statSub, { color: theme.textSecondary }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statTile: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  statSub: {
    fontSize: 11,
    marginTop: 2,
  },
  themeStack: {
    gap: 8,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  themePreviewDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '800',
  },
  themeSub: {
    fontSize: 12,
    marginTop: 1,
  },
  settingsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  segOption: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segText: {
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  resetBtn: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
