export interface AiMsg {
  role: "user" | "assistant" | "system";
  text: string;
  isGenerating?: boolean;
}

export type GamePhase = "WAITING_PROMPTS" | "BUILD_PHASE" | "RUN_PHASE" | "GRADING" | "COMPLETE";

export interface EvalBadge {
  total: number;
  attempts: number;
  chaos: number;
}

export interface JudgeScores {
  creativity: number;
  fun: number;
  chaos: number;
  uniqueness: number;
  total: number;
}

export interface JudgeResult {
  playerA: JudgeScores;
  playerB: JudgeScores;
  winner: "playerA" | "playerB";
  commentary: string;
}

export interface MatchState {
  roomId: string;
  phase: GamePhase;
  chaosSeed: string;
  playerA: string;
  playerB: string;
  games: { playerA: string | null; playerB: string | null };
  prompts: { playerA: string; playerB: string };
  judgeResult: JudgeResult | null;
  votes: { playerA: string | null; playerB: string | null };
  finalWinner: string | null;
  createdAt: number;
}

export interface GameAsset {
  dataUrl: string;
  description: string;
}
