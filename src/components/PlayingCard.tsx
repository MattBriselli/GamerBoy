import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, RANK_LABEL, SUIT_SYMBOL } from '../engine/types';
import { AppTheme } from '../theme/themes';

export interface PlayingCardProps {
  card: Card;
  width: number;
  height: number;
  theme: AppTheme;
  highlighted?: boolean;
  selected?: boolean;
}

const COURT_CROWN: Record<number, string> = {
  11: '⚔',
  12: '♛',
  13: '♚',
};

export const PlayingCard = memo(function PlayingCard({
  card,
  width,
  height,
  theme,
  highlighted = false,
  selected = false,
}: PlayingCardProps) {
  const borderRadius = Math.max(6, Math.round(width * 0.12));

  if (!card.faceUp) {
    return (
      <View
        style={[
          styles.cardShadow,
          {
            width,
            height,
            borderRadius,
            borderColor: highlighted ? theme.hintGlow : 'rgba(255,255,255,0.28)',
            borderWidth: highlighted ? 2 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={[theme.cardBackPrimary, theme.cardBackSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.backFill, { borderRadius: borderRadius - 1 }]}
        >
          <View
            style={[
              styles.backInnerFrame,
              {
                borderColor: theme.cardBackTrim,
                borderRadius: Math.max(3, borderRadius - 4),
              },
            ]}
          >
            <View
              style={[
                styles.backMedallion,
                { borderColor: theme.cardBackTrim },
              ]}
            >
              <Text
                style={[
                  styles.backGlyph,
                  { color: theme.cardBackTrim, fontSize: Math.max(9, Math.round(width * 0.22)) },
                ]}
              >
                ✦
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const inkColor = card.color === 'red' ? theme.cardRed : theme.cardBlack;
  const rankStr = RANK_LABEL[card.rank];
  const suitStr = SUIT_SYMBOL[card.suit];
  const isCourt = card.rank >= 11;
  const isAce = card.rank === 1;

  const rankFontSize = Math.max(11, Math.min(18, Math.round(width * 0.29)));
  const topSuitSize = Math.max(10, Math.min(15, Math.round(width * 0.24)));
  const centerFontSize = Math.max(
    18,
    Math.min(36, Math.round(width * (isAce ? 0.56 : isCourt ? 0.44 : 0.46)))
  );

  return (
    <View
      style={[
        styles.cardShadow,
        styles.faceContainer,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.cardFace,
          borderColor:
            highlighted || selected ? theme.hintGlow : theme.cardBorder,
          borderWidth: highlighted || selected ? 2.2 : 1,
        },
      ]}
    >
      {/* Top index row — always visible even when stacked in tableau */}
      <View style={styles.topRow}>
        <Text
          style={[
            styles.rankText,
            {
              color: inkColor,
              fontSize: rankFontSize,
              lineHeight: rankFontSize + 2,
            },
          ]}
          allowFontScaling={false}
        >
          {rankStr}
        </Text>
        <Text
          style={[
            styles.topSuitText,
            {
              color: inkColor,
              fontSize: topSuitSize,
              lineHeight: topSuitSize + 2,
            },
          ]}
          allowFontScaling={false}
        >
          {suitStr}
        </Text>
      </View>

      {/* Center motif */}
      <View style={styles.centerBox} pointerEvents="none">
        {isCourt ? (
          <View
            style={[
              styles.courtFrame,
              {
                borderColor: `${inkColor}26`,
                backgroundColor: `${inkColor}09`,
                width: Math.round(width * 0.72),
                height: Math.round(height * 0.48),
              },
            ]}
          >
            <Text
              style={{
                color: inkColor,
                fontSize: Math.max(10, Math.round(width * 0.22)),
                opacity: 0.85,
              }}
              allowFontScaling={false}
            >
              {COURT_CROWN[card.rank]}
            </Text>
            <Text
              style={[
                styles.courtLetter,
                { color: inkColor, fontSize: Math.round(centerFontSize * 0.82) },
              ]}
              allowFontScaling={false}
            >
              {rankStr}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              styles.centerSuit,
              {
                color: inkColor,
                fontSize: centerFontSize,
                opacity: isAce ? 0.95 : 0.85,
              },
            ]}
            allowFontScaling={false}
          >
            {suitStr}
          </Text>
        )}
      </View>

      {/* Bottom mirrored index */}
      <View style={styles.bottomRow} pointerEvents="none">
        <Text
          style={[
            styles.bottomIndex,
            { color: inkColor, fontSize: Math.max(9, rankFontSize - 3) },
          ]}
          allowFontScaling={false}
        >
          {rankStr}
          {suitStr}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 3.5,
    elevation: 3,
    userSelect: 'none',
  },
  backFill: {
    flex: 1,
    padding: 3,
  },
  backInnerFrame: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMedallion: {
    width: '54%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  backGlyph: {
    fontWeight: '700',
  },
  faceContainer: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  rankText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  topSuitText: {
    fontWeight: '700',
  },
  centerBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSuit: {
    fontWeight: '700',
    marginTop: 4,
  },
  courtFrame: {
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  courtLetter: {
    fontWeight: '900',
    marginTop: -2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  bottomIndex: {
    fontWeight: '700',
    opacity: 0.72,
    transform: [{ rotate: '180deg' }],
  },
});
