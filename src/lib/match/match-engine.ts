import * as memory from "@/lib/match/memory-engine";
import {
  useMemoryMatchBackend,
  usePostgresMatchBackend,
} from "@/lib/match/serverless-mode";
import * as postgres from "@/lib/match/serverless-engine";

export async function matchEnqueue(userId: string) {
  if (usePostgresMatchBackend()) return postgres.serverlessEnqueue(userId);
  if (useMemoryMatchBackend()) return memory.memoryEnqueue(userId);
  throw new Error("No polling match backend configured");
}

export async function matchQueueStatus(userId: string) {
  if (usePostgresMatchBackend()) return postgres.serverlessQueueStatus(userId);
  if (useMemoryMatchBackend()) return memory.memoryQueueStatus(userId);
  throw new Error("No polling match backend configured");
}

export async function matchSync(roomId: string, userId: string, since: number) {
  if (usePostgresMatchBackend()) return postgres.serverlessSync(roomId, userId, since);
  if (useMemoryMatchBackend()) return memory.memorySync(roomId, userId, since);
  throw new Error("No polling match backend configured");
}

export async function matchAction(msg: Record<string, unknown>) {
  if (usePostgresMatchBackend()) return postgres.serverlessAction(msg);
  if (useMemoryMatchBackend()) return memory.memoryAction(msg);
  throw new Error("No polling match backend configured");
}

export async function matchGetPublicRoom(roomId: string) {
  if (usePostgresMatchBackend()) return postgres.serverlessGetPublicRoom(roomId);
  if (useMemoryMatchBackend()) return memory.memoryGetPublicRoom(roomId);
  throw new Error("No polling match backend configured");
}

export async function matchSubmitCode(roomId: string, userId: string, html: string, assets: unknown[]) {
  if (usePostgresMatchBackend()) return postgres.serverlessSubmitCode(roomId, userId, html, assets);
  if (useMemoryMatchBackend()) return memory.memorySubmitCode(roomId, userId, html, assets);
  throw new Error("No polling match backend configured");
}
