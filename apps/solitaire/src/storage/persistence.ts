import { loadJson, loadRawJson, saveJson, ThemeId } from '@gamerboy/core';
import { DrawMode, GameState } from '../engine/types';

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

export function loadSettings(): Promise<UserSettings> {
  return loadJson(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export function saveSettings(settings: UserSettings): Promise<void> {
  return saveJson(KEYS.SETTINGS, settings);
}

export function loadStats(): Promise<PlayerStats> {
  return loadJson(KEYS.STATS, DEFAULT_STATS);
}

export function saveStats(stats: PlayerStats): Promise<void> {
  return saveJson(KEYS.STATS, stats);
}

export async function loadActiveGame(): Promise<GameState | null> {
  const parsed = await loadRawJson<GameState>(KEYS.ACTIVE_GAME);
  if (!parsed || !Array.isArray(parsed.tableau) || parsed.tableau.length !== 7) {
    return null;
  }
  return parsed;
}

export function saveActiveGame(game: GameState | null): Promise<void> {
  if (!game || game.isWon) {
    return saveJson(KEYS.ACTIVE_GAME, null);
  }
  const compact: GameState = {
    ...game,
    history: game.history.slice(-80),
  };
  return saveJson(KEYS.ACTIVE_GAME, compact);
}
