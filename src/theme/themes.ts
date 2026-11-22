export type ThemeId = 'emerald' | 'midnight' | 'ivory';

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  isDark: boolean;
  tableGradient: [string, string, string];
  surface: string;
  surfaceElevated: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  slotBg: string;
  slotBorder: string;
  cardFace: string;
  cardBorder: string;
  cardRed: string;
  cardBlack: string;
  cardBackPrimary: string;
  cardBackSecondary: string;
  cardBackTrim: string;
  hintGlow: string;
  success: string;
}

export const THEMES: Record<ThemeId, AppTheme> = {
  emerald: {
    id: 'emerald',
    name: 'Emerald Felt',
    subtitle: 'Classic club table with warm gold trim',
    isDark: true,
    tableGradient: ['#0F543D', '#0A3C2B', '#06261B'],
    surface: 'rgba(6, 32, 23, 0.84)',
    surfaceElevated: '#0D4330',
    surfaceBorder: 'rgba(244, 196, 78, 0.24)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBE3D8',
    textMuted: '#8AB3A1',
    accent: '#F4C44E',
    accentText: '#1A1405',
    accentSoft: 'rgba(244, 196, 78, 0.16)',
    slotBg: 'rgba(0, 0, 0, 0.22)',
    slotBorder: 'rgba(255, 255, 255, 0.18)',
    cardFace: '#FFFDF9',
    cardBorder: '#D8D3C8',
    cardRed: '#D62839',
    cardBlack: '#171C24',
    cardBackPrimary: '#17376E',
    cardBackSecondary: '#0F254C',
    cardBackTrim: '#E8C56B',
    hintGlow: '#F4C44E',
    success: '#34D399',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Slate',
    subtitle: 'Low-glare dark mode for evening play',
    isDark: true,
    tableGradient: ['#182032', '#101624', '#090D16'],
    surface: 'rgba(13, 18, 30, 0.88)',
    surfaceElevated: '#1B253B',
    surfaceBorder: 'rgba(148, 163, 184, 0.22)',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textMuted: '#7C8BA1',
    accent: '#38BDF8',
    accentText: '#061926',
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    slotBg: 'rgba(255, 255, 255, 0.04)',
    slotBorder: 'rgba(148, 163, 184, 0.2)',
    cardFace: '#F6F8FC',
    cardBorder: '#CBD5E1',
    cardRed: '#E11D48',
    cardBlack: '#0F172A',
    cardBackPrimary: '#312E81',
    cardBackSecondary: '#1E1B4B',
    cardBackTrim: '#818CF8',
    hintGlow: '#38BDF8',
    success: '#4ADE80',
  },
  ivory: {
    id: 'ivory',
    name: 'Warm Ivory',
    subtitle: 'Crisp sunlit linen & espresso ink',
    isDark: false,
    tableGradient: ['#EFE9DE', '#E4DCCD', '#D8CEBC'],
    surface: 'rgba(255, 252, 246, 0.9)',
    surfaceElevated: '#FFFFFF',
    surfaceBorder: 'rgba(120, 102, 78, 0.2)',
    textPrimary: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#8A8178',
    accent: '#B45309',
    accentText: '#FFFBEB',
    accentSoft: 'rgba(180, 83, 9, 0.12)',
    slotBg: 'rgba(92, 75, 55, 0.07)',
    slotBorder: 'rgba(92, 75, 55, 0.22)',
    cardFace: '#FFFFFF',
    cardBorder: '#D6D0C4',
    cardRed: '#C81E1E',
    cardBlack: '#1C1917',
    cardBackPrimary: '#7C2D12',
    cardBackSecondary: '#581C0C',
    cardBackTrim: '#FCD34D',
    hintGlow: '#D97706',
    success: '#059669',
  },
};

export const THEME_LIST: AppTheme[] = [THEMES.emerald, THEMES.midnight, THEMES.ivory];
