/**
 * Game-agnostic multiplayer contracts shared across all GamerBoy Studio apps.
 *
 * Any game (Solitaire Same-Seed Race, FreeCell Race, Spades, Hearts, Blackjack, etc.)
 * implements its own typed `TAction` & `TProgress` payload while reusing the same
 * room, invite-code, quick-match, presence, and transport adapter (e.g. Cloudflare
 * Durable Objects WebSockets or Firebase).
 */

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface PlayerPresence<TProgress = Record<string, unknown>> {
  playerId: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  connected: boolean;
  progress: TProgress;
}

export interface MultiplayerRoom<TProgress = Record<string, unknown>> {
  roomId: string;
  inviteCode: string; // 6-char shareable code
  gameId: string; // e.g. 'solitaire', 'freecell', 'spades'
  seed: number; // shared deterministic seed for fair boards
  status: RoomStatus;
  maxPlayers: number;
  players: PlayerPresence<TProgress>[];
  createdAt: number;
}

export interface RoomEvent<TAction = unknown, TProgress = Record<string, unknown>> {
  type: 'room_updated' | 'action' | 'player_joined' | 'player_left' | 'match_finished';
  senderId?: string;
  room?: MultiplayerRoom<TProgress>;
  action?: TAction;
  winnerId?: string;
}

export interface MultiplayerTransport<TAction = unknown, TProgress = Record<string, unknown>> {
  createRoom(options: {
    gameId: string;
    displayName: string;
    seed: number;
    maxPlayers?: number;
  }): Promise<MultiplayerRoom<TProgress>>;

  joinByCode(options: {
    inviteCode: string;
    displayName: string;
  }): Promise<MultiplayerRoom<TProgress>>;

  quickMatch(options: {
    gameId: string;
    displayName: string;
  }): Promise<MultiplayerRoom<TProgress>>;

  sendAction(roomId: string, action: TAction): Promise<void>;
  updateProgress(roomId: string, progress: TProgress): Promise<void>;
  setReady(roomId: string, ready: boolean): Promise<void>;
  leaveRoom(roomId: string): Promise<void>;

  subscribe(
    roomId: string,
    listener: (event: RoomEvent<TAction, TProgress>) => void
  ): () => void;
}
