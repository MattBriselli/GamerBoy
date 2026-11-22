import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawMode, GameState } from '../engine/types';
import { ThemeId } from '../theme/themes';

const KEYS = {
  SETTINGS: '@gamerboy_solitaire_settings_v1',
  STATS: '@gamerboy_solitaire_stats_v1',
  ACTIVE_GAME: '@gamerboy_solitaire_active_game_v1',
};

export interface UserSettings {
  drawMode: DrawMode;
  themeId: ThemeId;
  hapticsEnabled: boolean;
}

export interface PlayerStats {
  gamesStarted: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  highScore: number;
  bestTimeSeconds: number | null;
  fewestMoves: number | null;
  completedDailyDates: string[];
  recentSeeds: number[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  drawMode: 1,
  themeId: 'emerald',
  hapticsEnabled: true,
};

export const DEFAULT_STATS: PlayerStats = {
  gamesStarted: 0,
  gamesWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  highScore: 0,
  bestTimeSeconds: null,
  fewestMoves: null,
  completedDailyDates: [],
  recentSeeds: [],
};

export async function loadSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage write errors
  }
}

export async function loadStats(): Promise<PlayerStats> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STATS);
    if (!raw) return DEFAULT_STATS;
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATS;
  }
}

export async function saveStats(stats: PlayerStats): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch {
    // Ignore storage write errors
  }
}

export async function loadActiveGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVE_GAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || !Array.isArray(parsed.tableau) || parsed.tableau.length !== 7) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveGame(game: GameState | null): Promise<void> {
  try {
    if (!game || game.isWon) {
      await AsyncStorage.removeItem(KEYS.ACTIVE_GAME);
      return;
    }
    // Persist up to last 80 undo snapshots so disk writes stay fast
    const compact: GameState = {
      ...game,
      history: game.history.slice(-80),
    };
    await AsyncStorage.setItem(KEYS.ACTIVE_GAME, JSON.stringify(compact));
  } catch {
    // Ignore storage write errors
  }
}
