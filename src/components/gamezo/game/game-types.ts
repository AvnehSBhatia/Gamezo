export interface AiMsg {
  role: "user" | "assistant" | "system";
  text: string;
  isGenerating?: boolean;
}

export type GamePhase = "BUILD_PHASE" | "RUN_PHASE" | "GRADING" | "COMPLETE";

export interface EvalBadge {
  total: number;
  attempts: number;
  chaos: number;
}

export interface GameSessionInfo {
  roomId: string;
  userId: string;
}
