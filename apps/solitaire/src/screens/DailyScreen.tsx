import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTheme, formatLocalDate } from '@gamerboy/core';
import { AdBanner } from '@gamerboy/monetization';
import { SOLITAIRE_AD_UNITS } from '../config/ads';
import { DrawMode } from '../engine/types';
import { PlayerStats } from '../storage/persistence';

export interface DailyScreenProps {
  theme: AppTheme;
  drawMode: DrawMode;
  stats: PlayerStats;
  onBack: () => void;
  onPlayDailyDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function DailyScreen({
  theme,
  drawMode,
  stats,
  onBack,
  onPlayDailyDate,
}: DailyScreenProps) {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0..11
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const completedSet = useMemo(
    () => new Set(stats.completedDailyDates),
    [stats.completedDailyDates]
  );

  const calendarCells = useMemo(() => {
    const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: ({ day: number; dateStr: string; isFuture: boolean } | null)[] = [];

    for (let i = 0; i < firstDayWeekday; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      cells.push({
        day,
        dateStr,
        isFuture: dateStr > todayStr,
      });
    }
    return { cells, daysInMonth };
  }, [viewYear, viewMonth, todayStr]);

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`;
  const monthlyCompletedCount = useMemo(
    () => stats.completedDailyDates.filter((d) => d.startsWith(monthPrefix)).length,
    [stats.completedDailyDates, monthPrefix]
  );

  const canGoNextMonth =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isSelectedDone = completedSet.has(selectedDate);

  return (
    <LinearGradient colors={theme.tableGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Bar */}
        <View
          style={[
            styles.topBar,
            { backgroundColor: theme.surface, borderBottomColor: theme.surfaceBorder },
          ]}
        >
          <Pressable
            onPress={onBack}
            style={[
              styles.backBtn,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.surfaceBorder },
            ]}
          >
            <Text style={[styles.backBtnText, { color: theme.textPrimary }]}>
              ‹ Back
            </Text>
          </Pressable>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
            Daily Challenge
          </Text>
          <View style={styles.crownPill}>
            <Text style={[styles.crownCountText, { color: theme.accent }]}>
              👑 {stats.completedDailyDates.length}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Monthly Trophy Card */}
          <View
            style={[
              styles.progressCard,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: theme.textPrimary }]}>
                {MONTH_NAMES[viewMonth]} Crowns
              </Text>
              <Text style={[styles.progressCount, { color: theme.accent }]}>
                {monthlyCompletedCount} / {calendarCells.daysInMonth}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.slotBg }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.accent,
                    width: `${Math.min(
                      100,
                      Math.round((monthlyCompletedCount / calendarCells.daysInMonth) * 100)
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressHint, { color: theme.textMuted }]}>
              Every player receives the exact same solvable deal for each date.
            </Text>
          </View>

          {/* Calendar Grid Card */}
          <View
            style={[
              styles.calendarCard,
              { backgroundColor: theme.surface, borderColor: theme.surfaceBorder },
            ]}
          >
            {/* Month Switcher */}
            <View style={styles.monthNav}>
              <Pressable onPress={handlePrevMonth} style={styles.monthArrow}>
                <Text style={[styles.monthArrowText, { color: theme.textPrimary }]}>
                  ‹
                </Text>
              </Pressable>
              <Text style={[styles.monthLabel, { color: theme.textPrimary }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable
                onPress={handleNextMonth}
                disabled={!canGoNextMonth}
                style={[styles.monthArrow, !canGoNextMonth && { opacity: 0.25 }]}
              >
                <Text style={[styles.monthArrowText, { color: theme.textPrimary }]}>
                  ›
                </Text>
              </Pressable>
            </View>

            {/* Weekday Header */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text
                  key={w}
                  style={[styles.weekdayLabel, { color: theme.textMuted }]}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {calendarCells.cells.map((cell, idx) => {
                if (!cell) {
                  return <View key={`empty-${idx}`} style={styles.dayCellWrapper} />;
                }
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === todayStr;
                const isDone = completedSet.has(cell.dateStr);

                return (
                  <View key={cell.dateStr} style={styles.dayCellWrapper}>
                    <Pressable
                      disabled={cell.isFuture}
                      onPress={() => setSelectedDate(cell.dateStr)}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: isSelected
                            ? theme.accent
                            : isDone
                            ? theme.accentSoft
                            : 'transparent',
                          borderColor: isToday ? theme.accent : 'transparent',
                          borderWidth: isToday && !isSelected ? 1.5 : 0,
                          opacity: cell.isFuture ? 0.28 : 1,
                        },
                      ]}
                    >
                      {isDone ? (
                        <Text style={{ fontSize: 13 }}>👑</Text>
                      ) : (
                        <Text
                          style={[
                            styles.dayNumber,
                            {
                              color: isSelected
                                ? theme.accentText
                                : theme.textPrimary,
                            },
                          ]}
                        >
                          {cell.day}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Selected Date Play CTA */}
          <Pressable
            onPress={() => onPlayDailyDate(selectedDate)}
            style={({ pressed }) => [
              styles.playDailyBtn,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.playDailyTitle, { color: theme.accentText }]}>
              {isSelectedDone
                ? `Replay ${selectedDate} Challenge`
                : `Play ${selectedDate} Challenge`}
            </Text>
            <Text
              style={[
                styles.playDailySub,
                { color: theme.accentText, opacity: 0.82 },
              ]}
            >
              Verified Solvable Seed • Draw {drawMode}
            </Text>
          </Pressable>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
          <AdBanner config={SOLITAIRE_AD_UNITS} theme={theme} placement="daily" />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  crownPill: {
    minWidth: 54,
    alignItems: 'flex-end',
  },
  crownCountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressHint: {
    fontSize: 11,
    marginTop: 8,
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    fontSize: 24,
    fontWeight: '700',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
  },
  dayCell: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  playDailyBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  playDailyTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  playDailySub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
