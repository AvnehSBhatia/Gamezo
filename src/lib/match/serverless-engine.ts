import { db } from "@/lib/db/client";
import { matchEvents, matchQueue, matchRooms } from "@/lib/db/schema/match";
import { pickChaosSeed } from "@/lib/chaos-seeds";
import { judgeMatch, fallbackJudge as judgeFallback } from "@/lib/ai/judge";
import type { MatchRoomState } from "@/lib/match/types";
import {
  BUILD_MS,
  DEMO_MS,
  MAX_HTML_BYTES,
  STALE_GRADING_MS,
  createRoomState,
  isLegacyBotRoom,
  isReusableMatchRoom,
} from "@/lib/match/types";
import { and, asc, eq, gt, inArray, or, sql } from "drizzle-orm";

function genRoomId() {
  return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSlot(state: MatchRoomState, userId: string): "playerA" | "playerB" | null {
  if (state.playerA.userId === userId) return "playerA";
  if (state.playerB.userId === userId) return "playerB";
  return null;
}

function matchedPayload(roomId: string, state: MatchRoomState, userId: string) {
  const slot = getSlot(state, userId)!;
  return {
    type: "matched",
    roomId,
    yourSlot: slot,
    playerA: state.playerA.userId,
    playerB: state.playerB.userId,
    chaosSeed: state.chaosSeed,
    opponentIsBot: state.playerA.isBot || state.playerB.isBot,
  };
}

async function loadRoom(roomId: string) {
  const rows = await db.select().from(matchRooms).where(eq(matchRooms.id, roomId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, state: row.state as MatchRoomState, version: row.version };
}

async function findReusableRoomByUser(userId: string) {
  const rows = await db
    .select()
    .from(matchRooms)
    .where(or(eq(matchRooms.playerA, userId), eq(matchRooms.playerB, userId)));
  const legacyRoomIds: string[] = [];
  for (const row of rows) {
    const state = row.state as MatchRoomState;
    if (isLegacyBotRoom(state)) {
      legacyRoomIds.push(row.id);
      continue;
    }
    if (isReusableMatchRoom(state)) return row;
  }
  if (legacyRoomIds.length) {
    await db.transaction(async (tx) => {
      await tx.delete(matchEvents).where(inArray(matchEvents.roomId, legacyRoomIds));
      await tx.delete(matchRooms).where(inArray(matchRooms.id, legacyRoomIds));
    });
  }
  return null;
}

/**
 * Load → mutate → CAS-save with bounded retries. The CAS UPDATE and the
 * events INSERT run in a single `db.transaction()` so a crash between them
 * can't desync state from the event log. Events from a losing CAS attempt
 * are dropped (closure-local until commit).
 *
 * Returns `{ ok: false, result: null }` when the room was not found, and
 * `{ ok: false, result: <last attempt's result> }` when all retries lost CAS.
 */
async function mutateRoom<T>(
  roomId: string,
  fn: (state: MatchRoomState, push: (payload: Record<string, unknown>) => void) => Promise<T> | T,
  maxAttempts = 4,
): Promise<{ ok: boolean; result: T | null; reason?: "not_found" | "conflict" }> {
  let lastResult: T | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const room = await loadRoom(roomId);
    if (!room) return { ok: false, result: null, reason: "not_found" };
    const events: Record<string, unknown>[] = [];
    const push = (payload: Record<string, unknown>) => {
      events.push(payload);
    };
    lastResult = await fn(room.state, push);

    const committed = await db.transaction(async (tx) => {
      const updated = await tx
        .update(matchRooms)
        .set({ state: room.state, version: room.version + 1, updatedAt: new Date() })
        .where(and(eq(matchRooms.id, roomId), eq(matchRooms.version, room.version)))
        .returning({ id: matchRooms.id });
      if (updated.length === 0) return false;
      if (events.length) {
        await tx.insert(matchEvents).values(events.map((payload) => ({ roomId, payload })));
      }
      return true;
    });

    if (committed) return { ok: true, result: lastResult };
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 30));
    } else {
      console.warn(`[serverless-engine] CAS conflict after ${maxAttempts} attempts for room ${roomId}`);
    }
  }
  return { ok: false, result: lastResult, reason: "conflict" };
}

function roomSnapshot(roomId: string, state: MatchRoomState, userId: string) {
  const slot = getSlot(state, userId);
  const demoSlot = state.demoIndex === 0 ? "playerA" : "playerB";
  const demoPlayer = demoSlot === "playerA" ? state.playerA : state.playerB;
  const opponent = slot === "playerA" ? state.playerB : state.playerA;
  const remainingMs = state.buildEndsAt ? Math.max(0, state.buildEndsAt - Date.now()) : 0;
  const demoRemainingMs = state.demoEndsAt ? Math.max(0, state.demoEndsAt - Date.now()) : 0;

  return {
    type: "sync-state",
    roomId,
    state: state.phase,
    chaosSeed: state.chaosSeed,
    yourSlot: slot,
    remainingMs: state.phase === "BUILD_PHASE" ? remainingMs : 0,
    demoRemainingMs: state.phase === "RUN_PHASE" ? demoRemainingMs : 0,
    demoPlayer: state.phase === "RUN_PHASE" ? demoSlot : null,
    demoHtml: state.phase === "RUN_PHASE" ? demoPlayer.html || fallbackHtml(demoPlayer.userId) : null,
    demoIndex: state.demoIndex,
    promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
    ready: { playerA: state.playerA.ready, playerB: state.playerB.ready },
    opponentPromptLocked: opponent.promptLocked,
    judgeResult: state.judgeResult,
    votes: { playerA: state.playerA.vote, playerB: state.playerB.vote },
    shareUrl: `/watch/${roomId}`,
  };
}

function fallbackHtml(userId: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#111;color:#888;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><p>No game submitted — ${userId.slice(0, 8)}</p></body></html>`;
}

/**
 * Pure-ish state transition. Mutates `state` in place and emits events via
 * `push`. Returns true if this caller transitioned the room into GRADING —
 * the caller is then responsible for running the judge externally (so we
 * don't await an LLM call while holding a CAS-able state).
 */
function advanceTimersStep(
  state: MatchRoomState,
  push: (p: Record<string, unknown>) => void,
): { enteredGrading: boolean } {
  const now = Date.now();

  // Stale-grading recovery: if the previous poller transitioned to GRADING but
  // never committed a judge result (Vercel function killed mid-LLM-call), pick
  // up the work here. The `gradingStartedAt` bump prevents tight-loop retries.
  if (
    state.phase === "GRADING" &&
    state.gradingStartedAt &&
    now - state.gradingStartedAt >= STALE_GRADING_MS
  ) {
    console.warn(`[serverless-engine] stale GRADING detected (${now - state.gradingStartedAt}ms), retrying judge`);
    state.gradingStartedAt = now;
    return { enteredGrading: true };
  }

  if (state.phase === "WAITING_PROMPTS" && state.botLockAt && now >= state.botLockAt) {
    const bot = state.playerA.isBot ? state.playerA : state.playerB.isBot ? state.playerB : null;
    if (bot && !bot.promptLocked) {
      bot.promptLocked = true;
      bot.prompt = pickChaosSeed();
      push({
        type: "prompt-status",
        promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
      });
    }
    state.botLockAt = null;
  }

  if (state.phase === "WAITING_PROMPTS" && state.waitingPromptsTimeoutAt && now >= state.waitingPromptsTimeoutAt) {
    let changed = false;
    for (const p of [state.playerA, state.playerB]) {
      if (!p.promptLocked) {
        p.promptLocked = true;
        if (!p.prompt) p.prompt = pickChaosSeed();
        changed = true;
      }
    }
    if (changed) {
      push({
        type: "prompt-status",
        reason: "timeout",
        promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
      });
    }
    state.waitingPromptsTimeoutAt = null;
  }

  if (state.phase === "WAITING_PROMPTS" && state.playerA.promptLocked && state.playerB.promptLocked) {
    state.phase = "BUILD_PHASE";
    state.buildEndsAt = now + BUILD_MS;
    state.playerA.ready = false;
    state.playerB.ready = false;
    push({ type: "phase-change", state: "BUILD_PHASE", remainingMs: BUILD_MS, chaosSeed: state.chaosSeed });
  }

  if (state.phase === "BUILD_PHASE" && state.buildEndsAt && now >= state.buildEndsAt) {
    state.phase = "RUN_PHASE";
    state.demoIndex = 0;
    state.demoEndsAt = now + DEMO_MS;
    pushDemoPhase(state, push);
  }

  if (state.phase === "RUN_PHASE" && state.demoEndsAt && now >= state.demoEndsAt) {
    if (state.demoIndex === 0) {
      state.demoIndex = 1;
      state.demoEndsAt = now + DEMO_MS;
      pushDemoPhase(state, push);
    } else {
      state.phase = "GRADING";
      state.gradingStartedAt = now;
      push({ type: "phase-change", state: "GRADING" });
      return { enteredGrading: true };
    }
  }

  return { enteredGrading: false };
}

function pushDemoPhase(state: MatchRoomState, push: (p: Record<string, unknown>) => void) {
  const demoSlot = state.demoIndex === 0 ? "playerA" : "playerB";
  const demoPlayer = demoSlot === "playerA" ? state.playerA : state.playerB;
  push({
    type: "phase-change",
    state: "RUN_PHASE",
    demoPlayer: demoSlot,
    demoHtml: demoPlayer.html || fallbackHtml(demoPlayer.userId),
    demoRemainingMs: state.demoEndsAt ? Math.max(0, state.demoEndsAt - Date.now()) : DEMO_MS,
    demoIndex: state.demoIndex,
  });
}

async function callAiJudge(state: MatchRoomState, roomId: string): Promise<unknown> {
  try {
    // Direct in-process call — going via the public `/api/ai-judge` route
    // would hit the per-IP rate limiter under that internal IP and silently
    // fall back to fake scores once the bucket drains.
    return await judgeMatch({
      roomId,
      playerA: { html: state.playerA.html, prompt: state.playerA.prompt },
      playerB: { html: state.playerB.html, prompt: state.playerB.prompt },
    });
  } catch {
    return judgeFallback(state.playerA.html, state.playerB.html);
  }
}

async function commitJudgeResult(roomId: string, judgeResult: unknown): Promise<void> {
  // Second-phase mutation: now that the LLM call is done, attach the result
  // and flip to COMPLETE. CAS retries handle interleaved client actions.
  const result = await mutateRoom(roomId, (state, push) => {
    if (state.phase !== "GRADING") {
      // Another caller (e.g. stale-grading retry) already committed a result.
      return { committed: false } as const;
    }
    state.judgeResult = judgeResult;
    state.phase = "COMPLETE";
    push({
      type: "grade-complete",
      judgeResult,
      votes: { playerA: state.playerA.vote, playerB: state.playerB.vote },
      shareUrl: `/watch/${roomId}`,
    });
    return { committed: true } as const;
  });
  if (result.ok && result.result && !result.result.committed) {
    console.debug(`[serverless-engine] judge already committed for ${roomId}`);
  } else if (!result.ok) {
    console.warn(`[serverless-engine] commitJudgeResult ${result.reason} for ${roomId}`);
  }
}

async function driveTimersAndMaybeJudge(roomId: string): Promise<void> {
  const stepRes = await mutateRoom(roomId, (state, push) => advanceTimersStep(state, push));
  if (stepRes.ok && stepRes.result?.enteredGrading) {
    const room = await loadRoom(roomId);
    if (!room) return;
    const judgeResult = await callAiJudge(room.state, roomId);
    await commitJudgeResult(roomId, judgeResult);
  }
}

export async function serverlessEnqueue(userId: string) {
  return db.transaction(async (tx) => {
    // Serialize ALL enqueue transactions on one global advisory lock. Holds
    // only for the duration of this tx and works regardless of whether
    // `match_queue` has rows — `SELECT … FOR UPDATE` locks nothing on an
    // empty table, which was the original TOCTOU failure mode.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('gamezo_match_queue'))`);

    // Existing-room check is now INSIDE the lock — no TOCTOU window between
    // pre-flight and the rest of the pairing logic.
    const existingRows = await tx
      .select()
      .from(matchRooms)
      .where(or(eq(matchRooms.playerA, userId), eq(matchRooms.playerB, userId)));
    const legacyRoomIds: string[] = [];
    for (const existing of existingRows) {
      const state = existing.state as MatchRoomState;
      if (isLegacyBotRoom(state)) {
        legacyRoomIds.push(existing.id);
        continue;
      }
      if (isReusableMatchRoom(state)) {
        return matchedPayload(existing.id, state, userId);
      }
    }
    if (legacyRoomIds.length) {
      await tx.delete(matchEvents).where(inArray(matchEvents.roomId, legacyRoomIds));
      await tx.delete(matchRooms).where(inArray(matchRooms.id, legacyRoomIds));
    }

    await tx.delete(matchQueue).where(eq(matchQueue.userId, userId));
    const previewSeed = pickChaosSeed();
    await tx.insert(matchQueue).values({ userId, previewSeed });

    const queued = await tx.select().from(matchQueue).orderBy(asc(matchQueue.joinedAt));
    if (queued.length >= 2) {
      const [a, b] = queued.slice(0, 2);
      await tx.delete(matchQueue).where(inArray(matchQueue.userId, [a.userId, b.userId]));
      const roomId = genRoomId();
      const chaosSeed = pickChaosSeed();
      const state = createRoomState(a.userId, b.userId, false, chaosSeed);
      await tx.insert(matchRooms).values({ id: roomId, playerA: a.userId, playerB: b.userId, state });
      // Initial matched events are part of the same transaction so a crash
      // can't leave a room without the corresponding event log.
      await tx.insert(matchEvents).values([
        { roomId, payload: matchedPayload(roomId, state, a.userId) },
        { roomId, payload: matchedPayload(roomId, state, b.userId) },
      ]);
      return matchedPayload(roomId, state, userId);
    }

    return { type: "queued", queueSize: queued.length, previewSeed };
  });
}

export async function serverlessQueueStatus(userId: string) {
  const roomRow = await findReusableRoomByUser(userId);
  if (roomRow) {
    return matchedPayload(roomRow.id, roomRow.state as MatchRoomState, userId);
  }

  const inQueueRows = await db.select().from(matchQueue).where(eq(matchQueue.userId, userId)).limit(1);
  const inQueue = inQueueRows[0];
  if (inQueue) {
    // COUNT instead of `SELECT *` for queue size — the original code pulled
    // every row just to read `.length`. The `::int` cast prevents postgres-js
    // from returning a BigInt (default for COUNT(*) which is bigint) that
    // Number() coerces with precision loss on very large counts.
    const sizeRows = await db.execute(sql`SELECT COUNT(*)::int AS n FROM match_queue`);
    const size = Number((sizeRows as unknown as Array<{ n: number }>)[0]?.n ?? 0);
    return { type: "queued", queueSize: size };
  }

  return { type: "idle" };
}

export async function serverlessSync(roomId: string, userId: string, since: number) {
  const room = await loadRoom(roomId);
  if (!room) return { events: [], latestId: since };

  await driveTimersAndMaybeJudge(roomId);
  const refreshed = await loadRoom(roomId);
  if (!refreshed) return { events: [], latestId: since };

  const rows = await db
    .select()
    .from(matchEvents)
    .where(and(eq(matchEvents.roomId, roomId), gt(matchEvents.id, since)))
    .orderBy(asc(matchEvents.id));

  const events = rows.map((r) => ({ id: r.id, ...(r.payload as Record<string, unknown>) }));
  const latestId = rows.length ? rows[rows.length - 1]!.id : since;

  if (since === 0 && getSlot(refreshed.state, userId)) {
    events.unshift({ id: 0, ...roomSnapshot(roomId, refreshed.state, userId) });
  }

  return { events, latestId, snapshot: roomSnapshot(roomId, refreshed.state, userId) };
}

export async function serverlessAction(msg: Record<string, unknown>) {
  const type = String(msg.type ?? "");
  const userId = String(msg.userId ?? "");
  const roomId = String(msg.roomId ?? "");

  if (type === "join-room") {
    const room = await loadRoom(roomId);
    if (!room || !getSlot(room.state, userId)) return { error: "Room not found" };
    await driveTimersAndMaybeJudge(roomId);
    const refreshed = (await loadRoom(roomId))!;
    return { ok: true, snapshot: roomSnapshot(roomId, refreshed.state, userId) };
  }

  // Validate membership against current state before mutating.
  const room = await loadRoom(roomId);
  if (!room) return { error: "Room not found" };
  if (!getSlot(room.state, userId)) return { error: "Not in room" };

  if (type === "lock-prompt") {
    const promptText = String(msg.prompt ?? "").slice(0, 200);
    const mutation = await mutateRoom(roomId, (state, push) => {
      const slot = getSlot(state, userId);
      if (!slot) return;
      const player = slot === "playerA" ? state.playerA : state.playerB;
      const opponent = slot === "playerA" ? state.playerB : state.playerA;
      player.promptLocked = true;
      player.prompt = promptText;
      push({
        type: "prompt-status",
        promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
      });
      if (opponent.isBot && !state.botLockAt) state.botLockAt = Date.now() + 1200;
    });
    if (mutation.ok) await driveTimersAndMaybeJudge(roomId);
    return { ok: mutation.ok };
  }

  if (type === "player-ready") {
    const mutation = await mutateRoom(roomId, (state, push) => {
      if (state.phase !== "BUILD_PHASE") return;
      const slot = getSlot(state, userId);
      if (!slot) return;
      const player = slot === "playerA" ? state.playerA : state.playerB;
      const opponent = slot === "playerA" ? state.playerB : state.playerA;
      player.ready = true;
      if (opponent.isBot) opponent.ready = true;
      push({ type: "ready-status", ready: { playerA: state.playerA.ready, playerB: state.playerB.ready } });
      if (state.playerA.ready && state.playerB.ready) {
        state.phase = "RUN_PHASE";
        state.demoIndex = 0;
        state.demoEndsAt = Date.now() + DEMO_MS;
        pushDemoPhase(state, push);
      }
    });
    return { ok: mutation.ok };
  }

  if (type === "demo-input") {
    // Demo input is fire-and-forget; it doesn't mutate room state, just
    // appends an event for the spectator stream.
    if (room.state.phase !== "RUN_PHASE") return { ok: true };
    const slot = getSlot(room.state, userId);
    if (!slot) return { ok: true };
    const demoSlot = room.state.demoIndex === 0 ? "playerA" : "playerB";
    const playingSlot = demoSlot === "playerA" ? "playerB" : "playerA";
    if (slot !== playingSlot) return { ok: true };
    await db.insert(matchEvents).values({ roomId, payload: { type: "demo-input", event: msg.event } });
    return { ok: true };
  }

  if (type === "vote") {
    const voteFor = msg.voteFor === "playerA" || msg.voteFor === "playerB" ? msg.voteFor : null;
    if (!voteFor) return { ok: true };
    const mutation = await mutateRoom(roomId, (state, push) => {
      const slot = getSlot(state, userId);
      if (!slot || voteFor === slot) return;
      const player = slot === "playerA" ? state.playerA : state.playerB;
      player.vote = voteFor;
      push({ type: "vote-update", votes: { playerA: state.playerA.vote, playerB: state.playerB.vote } });
    });
    return { ok: mutation.ok };
  }

  if (type === "find-new") {
    const mutation = await mutateRoom(roomId, (state, push) => {
      state.phase = "COMPLETE";
      state.judgeResult = { abandoned: true };
      state.rematchRequests = [];
      state.buildEndsAt = null;
      state.demoEndsAt = null;
      state.gradingStartedAt = null;
      push({ type: "return-to-queue" });
    });
    return { ok: mutation.ok };
  }

  return { error: `Unknown action: ${type}` };
}

export async function serverlessGetPublicRoom(roomId: string) {
  const room = await loadRoom(roomId);
  if (!room) return null;
  const s = room.state;
  return {
    roomId,
    phase: s.phase,
    chaosSeed: s.chaosSeed,
    playerA: s.playerA.userId,
    playerB: s.playerB.userId,
    games: { playerA: s.playerA.html || null, playerB: s.playerB.html || null },
    prompts: { playerA: s.playerA.prompt, playerB: s.playerB.prompt },
    judgeResult: s.judgeResult,
    votes: { playerA: s.playerA.vote, playerB: s.playerB.vote },
    finalWinner: null,
    createdAt: Date.now(),
  };
}

export async function serverlessSubmitCode(roomId: string, userId: string, html: string, assets: unknown[]) {
  if (html.length > MAX_HTML_BYTES) {
    return { error: `Submission too large (${html.length} bytes, max ${MAX_HTML_BYTES})` };
  }
  // Pre-flight check disambiguates "room not found" from CAS conflict so the
  // HTTP layer can return a meaningful status code (404 vs 409).
  const room = await loadRoom(roomId);
  if (!room) return { error: "Room not found" };
  if (!getSlot(room.state, userId)) return { error: "Not in room" };

  const mutation = await mutateRoom(roomId, (state) => {
    const slot = getSlot(state, userId);
    if (!slot) return;
    const player = slot === "playerA" ? state.playerA : state.playerB;
    player.html = html;
    player.assets = assets;
  });
  if (!mutation.ok && mutation.reason === "not_found") return { error: "Room not found" };
  if (!mutation.ok) return { error: "Save conflict — try again" };
  return { ok: true };
}
