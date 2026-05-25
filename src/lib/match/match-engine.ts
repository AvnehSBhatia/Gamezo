import * as memory from "@/lib/match/memory-engine";
import {
  usesMemoryMatchBackend,
  usesPostgresMatchBackend,
} from "@/lib/match/serverless-mode";
import * as postgres from "@/lib/match/serverless-engine";

export async function matchEnqueue(userId: string) {
  if (usesPostgresMatchBackend()) return postgres.serverlessEnqueue(userId);
  if (usesMemoryMatchBackend()) return memory.memoryEnqueue(userId);
  throw new Error("No polling match backend configured");
}

export async function matchQueueStatus(userId: string) {
  if (usesPostgresMatchBackend()) return postgres.serverlessQueueStatus(userId);
  if (usesMemoryMatchBackend()) return memory.memoryQueueStatus(userId);
  throw new Error("No polling match backend configured");
}

export async function matchDequeue(userId: string) {
  if (usesPostgresMatchBackend()) return postgres.serverlessDequeue(userId);
  if (usesMemoryMatchBackend()) return memory.memoryDequeue(userId);
  throw new Error("No polling match backend configured");
}

export async function matchSync(roomId: string, userId: string, since: number) {
  if (usesPostgresMatchBackend()) return postgres.serverlessSync(roomId, userId, since);
  if (usesMemoryMatchBackend()) return memory.memorySync(roomId, userId, since);
  throw new Error("No polling match backend configured");
}

export async function matchAction(msg: Record<string, unknown>) {
  if (usesPostgresMatchBackend()) return postgres.serverlessAction(msg);
  if (usesMemoryMatchBackend()) return memory.memoryAction(msg);
  throw new Error("No polling match backend configured");
}

export async function matchGetPublicRoom(roomId: string) {
  if (usesPostgresMatchBackend()) return postgres.serverlessGetPublicRoom(roomId);
  if (usesMemoryMatchBackend()) return memory.memoryGetPublicRoom(roomId);
  throw new Error("No polling match backend configured");
}

export async function matchSubmitCode(roomId: string, userId: string, html: string, assets: unknown[]) {
  if (usesPostgresMatchBackend()) return postgres.serverlessSubmitCode(roomId, userId, html, assets);
  if (usesMemoryMatchBackend()) return memory.memorySubmitCode(roomId, userId, html, assets);
  throw new Error("No polling match backend configured");
}
