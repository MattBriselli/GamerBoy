import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '@gamerboy/core';

export interface BottomToolbarProps {
  theme: AppTheme;
  canUndo: boolean;
  undoCount: number;
  showAutoComplete: boolean;
  isAutoCompleting: boolean;
  hintMessage: string | null;
  onNewDealPress: () => void;
  onSettingsPress: () => void;
  onHintPress: () => void;
  onUndoPress: () => void;
  onAutoCompletePress: () => void;
}

export function BottomToolbar({
  theme,
  canUndo,
  undoCount,
  showAutoComplete,
  isAutoCompleting,
  hintMessage,
  onNewDealPress,
  onSettingsPress,
  onHintPress,
  onUndoPress,
  onAutoCompletePress,
}: BottomToolbarProps) {
  return (
    <View style={styles.wrapper}>
      {/* Floating Auto-Complete Banner */}
      {showAutoComplete && !isAutoCompleting && (
        <View style={styles.floatingCtaRow}>
          <Pressable
            onPress={onAutoCompletePress}
            style={({ pressed }) => [
              styles.autoCompleteBtn,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Auto-complete remaining cards"
          >
            <Text style={[styles.autoCompleteText, { color: theme.accentText }]}>
              ✦ Auto-Complete Deal
            </Text>
          </Pressable>
        </View>
      )}

      {/* Hint Toast */}
      {hintMessage && !showAutoComplete && (
        <View style={styles.floatingCtaRow}>
          <View
            style={[
              styles.hintPill,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.hintGlow,
              },
            ]}
          >
            <Text style={[styles.hintText, { color: theme.textPrimary }]}>
              💡 {hintMessage}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.surfaceBorder,
          },
        ]}
      >
        <ToolbarButton
          icon="🃏"
          label="Deals"
          theme={theme}
          onPress={onNewDealPress}
        />
        <ToolbarButton
          icon="🎨"
          label="Style"
          theme={theme}
          onPress={onSettingsPress}
        />
        <ToolbarButton
          icon="💡"
          label="Hint"
          theme={theme}
          onPress={onHintPress}
        />
        <ToolbarButton
          icon="↶"
          label={undoCount > 0 ? `Undo (${undoCount})` : 'Undo'}
          theme={theme}
          disabled={!canUndo || isAutoCompleting}
          onPress={onUndoPress}
        />
      </View>
    </View>
  );
}

function ToolbarButton({
  icon,
  label,
  theme,
  disabled = false,
  onPress,
}: {
  icon: string;
  label: string;
  theme: AppTheme;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          opacity: disabled ? 0.38 : pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.actionIcon, { color: theme.textPrimary }]}>{icon}</Text>
      <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  floatingCtaRow: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  autoCompleteBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  autoCompleteText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hintPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
