import type { GamePhase } from "@/components/gamezo/game/game-types";

export interface MatchPlayer {
  userId: string;
  isBot: boolean;
  promptLocked: boolean;
  prompt: string;
  ready: boolean;
  html: string;
  assets: unknown[];
  vote: string | null;
}

export interface MatchRoomState {
  playerA: MatchPlayer;
  playerB: MatchPlayer;
  phase: GamePhase;
  chaosSeed: string;
  buildEndsAt: number | null;
  demoIndex: number;
  demoEndsAt: number | null;
  judgeResult: unknown | null;
  rematchRequests: string[];
  botLockAt: number | null;
}

export function createPlayer(userId: string, isBot = false): MatchPlayer {
  return {
    userId,
    isBot,
    promptLocked: false,
    prompt: "",
    ready: false,
    html: "",
    assets: [],
    vote: null,
  };
}

export function createRoomState(playerAId: string, playerBId: string, isBotB: boolean, chaosSeed: string): MatchRoomState {
  return {
    playerA: createPlayer(playerAId),
    playerB: createPlayer(playerBId, isBotB),
    phase: "WAITING_PROMPTS",
    chaosSeed,
    buildEndsAt: null,
    demoIndex: 0,
    demoEndsAt: null,
    judgeResult: null,
    rematchRequests: [],
    botLockAt: null,
  };
}

export const BUILD_MS = 5 * 60 * 1000;
export const DEMO_MS = 30 * 1000;
export const BOT_MATCH_MS = 5000;
