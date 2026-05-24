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
  /** Wall-clock at which any still-unlocked prompts get force-locked so a
   *  stalled or disconnected player can't wedge the room indefinitely. */
  waitingPromptsTimeoutAt: number | null;
  /** Wall-clock when this room first transitioned to GRADING. Used to detect
   *  a Vercel-function kill between "phase=GRADING" CAS and judge completion;
   *  if a poll arrives more than STALE_GRADING_MS later, the judge is retried. */
  gradingStartedAt: number | null;
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
    waitingPromptsTimeoutAt: Date.now() + WAITING_PROMPTS_TIMEOUT_MS,
    gradingStartedAt: null,
  };
}

export const BUILD_MS = 60 * 1000;
export const DEMO_MS = 30 * 1000;
export const BOT_MATCH_MS = 5000;
export const WAITING_PROMPTS_TIMEOUT_MS = 60 * 1000;
export const MAX_HTML_BYTES = 256 * 1024;
/** A room sitting in GRADING longer than this is presumed stuck (Vercel
 *  function killed mid-judge). Next poller retries the judge. */
export const STALE_GRADING_MS = 30 * 1000;
