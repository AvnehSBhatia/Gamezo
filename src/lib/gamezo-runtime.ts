export type MatchPhase =
  | "QUEUED"
  | "ROOM_READY"
  | "BUILD_PHASE"
  | "PLAYER_A_DEMO"
  | "PLAYER_B_DEMO"
  | "VOTING"
  | "COMPLETE";

export type PlayerSlot = "playerA" | "playerB";

export interface PublicSubmission {
  userId: string;
  slot: PlayerSlot;
  html: string;
  submittedAt: string;
}

export interface JudgingScores {
  creativity: number;
  fun: number;
  chaos: number;
  uniqueness: number;
  peerVote: number;
  total: number;
}

export interface JudgingResult {
  winner: PlayerSlot;
  commentary: string[];
  scores: Record<PlayerSlot, JudgingScores>;
  createdAt: string;
}

export interface PublicMatchState {
  roomId: string;
  phase: MatchPhase;
  players: Record<PlayerSlot, string>;
  submissions: Partial<Record<PlayerSlot, PublicSubmission>>;
  votes: Partial<Record<string, PlayerSlot>>;
  judgingResult: JudgingResult | null;
  createdAt: string;
}

export interface GamezoRuntime {
  validateAction(input: {
    roomId: string;
    userId: string;
    matchToken: string;
    allowedPhases?: MatchPhase[];
  }): Promise<{ ok: true } | { ok: false; error: string; status: number }>;
  getPublicMatch(roomId: string): Promise<PublicMatchState | null>;
  saveJudgingResult(roomId: string, result: JudgingResult): Promise<void>;
}

declare global {
  var __GAMEZO_RUNTIME: GamezoRuntime | undefined;
}

export function getGamezoRuntime(): GamezoRuntime | null {
  return globalThis.__GAMEZO_RUNTIME ?? null;
}
