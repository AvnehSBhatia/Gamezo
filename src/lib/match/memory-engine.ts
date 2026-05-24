import { pickChaosSeed } from "@/lib/chaos-seeds";
import { judgeMatch, fallbackJudge as judgeFallback } from "@/lib/ai/judge";
import { getMemoryStore } from "@/lib/match/memory-store";
import type { MatchRoomState } from "@/lib/match/types";
import { BUILD_MS, DEMO_MS, MAX_HTML_BYTES, STALE_GRADING_MS, createRoomState } from "@/lib/match/types";

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

function pushEvent(roomId: string, payload: Record<string, unknown>) {
  const store = getMemoryStore();
  const list = store.events.get(roomId) ?? [];
  list.push({ id: store.nextEventId++, payload });
  store.events.set(roomId, list);
}

function loadRoom(roomId: string) {
  const state = getMemoryStore().rooms.get(roomId);
  if (!state) return null;
  return { id: roomId, state };
}

function findRoomByUser(userId: string) {
  const store = getMemoryStore();
  const roomId = store.userRoom.get(userId);
  if (!roomId) return null;
  const state = store.rooms.get(roomId);
  if (!state) return null;
  return { id: roomId, state };
}

function saveRoom(roomId: string, state: MatchRoomState) {
  getMemoryStore().rooms.set(roomId, state);
}

function createRoom(roomId: string, playerAId: string, playerBId: string, isBotB: boolean, chaosSeed: string) {
  const store = getMemoryStore();
  const state = createRoomState(playerAId, playerBId, isBotB, chaosSeed);
  store.rooms.set(roomId, state);
  store.userRoom.set(playerAId, roomId);
  store.userRoom.set(playerBId, roomId);
  return state;
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

async function advanceTimers(roomId: string, state: MatchRoomState) {
  const now = Date.now();

  // Stale-grading recovery: same defensive check as in serverless-engine.
  if (
    state.phase === "GRADING" &&
    state.gradingStartedAt &&
    now - state.gradingStartedAt >= STALE_GRADING_MS
  ) {
    console.warn(`[memory-engine] stale GRADING detected (${now - state.gradingStartedAt}ms), retrying judge`);
    state.gradingStartedAt = now;
    saveRoom(roomId, state);
    await runJudge(roomId, state);
    return;
  }

  if (state.phase === "WAITING_PROMPTS" && state.botLockAt && now >= state.botLockAt) {
    const bot = state.playerA.isBot ? state.playerA : state.playerB.isBot ? state.playerB : null;
    if (bot && !bot.promptLocked) {
      bot.promptLocked = true;
      bot.prompt = pickChaosSeed();
      pushEvent(roomId, {
        type: "prompt-status",
        promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
      });
    }
    state.botLockAt = null;
  }

  // Force-lock any still-unlocked prompts once the WAITING_PROMPTS timeout
  // expires so a stalled or disconnected player can't wedge the room.
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
      pushEvent(roomId, {
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
    pushEvent(roomId, { type: "phase-change", state: "BUILD_PHASE", remainingMs: BUILD_MS, chaosSeed: state.chaosSeed });
  }

  if (state.phase === "BUILD_PHASE" && state.buildEndsAt && now >= state.buildEndsAt) {
    state.phase = "RUN_PHASE";
    state.demoIndex = 0;
    state.demoEndsAt = now + DEMO_MS;
    pushDemoPhase(roomId, state);
  }

  if (state.phase === "RUN_PHASE" && state.demoEndsAt && now >= state.demoEndsAt) {
    if (state.demoIndex === 0) {
      state.demoIndex = 1;
      state.demoEndsAt = now + DEMO_MS;
      pushDemoPhase(roomId, state);
    } else {
      state.phase = "GRADING";
      state.gradingStartedAt = now;
      pushEvent(roomId, { type: "phase-change", state: "GRADING" });
      await runJudge(roomId, state);
    }
  }

  saveRoom(roomId, state);
}

function pushDemoPhase(roomId: string, state: MatchRoomState) {
  const demoSlot = state.demoIndex === 0 ? "playerA" : "playerB";
  const demoPlayer = demoSlot === "playerA" ? state.playerA : state.playerB;
  pushEvent(roomId, {
    type: "phase-change",
    state: "RUN_PHASE",
    demoPlayer: demoSlot,
    demoHtml: demoPlayer.html || fallbackHtml(demoPlayer.userId),
    demoRemainingMs: state.demoEndsAt ? Math.max(0, state.demoEndsAt - Date.now()) : DEMO_MS,
    demoIndex: state.demoIndex,
  });
}

async function runJudge(roomId: string, state: MatchRoomState) {
  let judgeResult: unknown;
  try {
    // Direct in-process call — see serverless-engine for rationale.
    judgeResult = await judgeMatch({
      roomId,
      playerA: { html: state.playerA.html, prompt: state.playerA.prompt },
      playerB: { html: state.playerB.html, prompt: state.playerB.prompt },
    });
  } catch {
    judgeResult = judgeFallback(state.playerA.html, state.playerB.html);
  }
  state.judgeResult = judgeResult;
  state.phase = "COMPLETE";
  saveRoom(roomId, state);
  pushEvent(roomId, {
    type: "grade-complete",
    judgeResult,
    votes: { playerA: state.playerA.vote, playerB: state.playerB.vote },
    shareUrl: `/watch/${roomId}`,
  });
}

export async function memoryEnqueue(userId: string) {
  const store = getMemoryStore();
  const existing = findRoomByUser(userId);
  if (existing) return matchedPayload(existing.id, existing.state, userId);

  store.queue.delete(userId);
  const previewSeed = pickChaosSeed();
  store.queue.set(userId, { userId, joinedAt: Date.now(), previewSeed });

  const queued = [...store.queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  if (queued.length >= 2) {
    const [a, b] = queued.slice(0, 2);
    store.queue.delete(a.userId);
    store.queue.delete(b.userId);
    const roomId = genRoomId();
    const chaosSeed = pickChaosSeed();
    const state = createRoom(roomId, a.userId, b.userId, false, chaosSeed);
    pushEvent(roomId, matchedPayload(roomId, state, a.userId));
    pushEvent(roomId, matchedPayload(roomId, state, b.userId));
    return matchedPayload(roomId, state, userId);
  }

  return { type: "queued", queueSize: queued.length, previewSeed };
}

export async function memoryQueueStatus(userId: string) {
  const roomRow = findRoomByUser(userId);
  if (roomRow) return matchedPayload(roomRow.id, roomRow.state, userId);

  const inQueue = getMemoryStore().queue.get(userId);
  if (inQueue) {
    return { type: "queued", queueSize: getMemoryStore().queue.size };
  }

  return { type: "idle" };
}

export async function memorySync(roomId: string, userId: string, since: number) {
  const room = loadRoom(roomId);
  if (!room) return { events: [], latestId: since };

  await advanceTimers(roomId, room.state);
  const refreshed = loadRoom(roomId);
  if (!refreshed) return { events: [], latestId: since };

  const all = getMemoryStore().events.get(roomId) ?? [];
  const rows = all.filter((e) => e.id > since);
  const events = rows.map((r) => ({ id: r.id, ...r.payload }));
  const latestId = rows.length ? rows[rows.length - 1]!.id : since;

  if (since === 0 && getSlot(refreshed.state, userId)) {
    events.unshift({ id: 0, ...roomSnapshot(roomId, refreshed.state, userId) });
  }

  return { events, latestId, snapshot: roomSnapshot(roomId, refreshed.state, userId) };
}

export async function memoryAction(msg: Record<string, unknown>) {
  const type = String(msg.type ?? "");
  const userId = String(msg.userId ?? "");
  const roomId = String(msg.roomId ?? "");

  if (type === "join-room") {
    const room = loadRoom(roomId);
    if (!room || !getSlot(room.state, userId)) return { error: "Room not found" };
    await advanceTimers(roomId, room.state);
    const refreshed = loadRoom(roomId)!;
    return { ok: true, snapshot: roomSnapshot(roomId, refreshed.state, userId) };
  }

  const room = loadRoom(roomId);
  if (!room) return { error: "Room not found" };
  const slot = getSlot(room.state, userId);
  if (!slot) return { error: "Not in room" };
  const state = room.state;
  const player = slot === "playerA" ? state.playerA : state.playerB;
  const opponent = slot === "playerA" ? state.playerB : state.playerA;

  if (type === "lock-prompt") {
    player.promptLocked = true;
    player.prompt = String(msg.prompt ?? "").slice(0, 200);
    pushEvent(roomId, {
      type: "prompt-status",
      promptLocked: { playerA: state.playerA.promptLocked, playerB: state.playerB.promptLocked },
    });
    if (opponent.isBot && !state.botLockAt) state.botLockAt = Date.now() + 1200;
    saveRoom(roomId, state);
    await advanceTimers(roomId, state);
    return { ok: true };
  }

  if (type === "player-ready" && state.phase === "BUILD_PHASE") {
    player.ready = true;
    if (opponent.isBot) opponent.ready = true;
    pushEvent(roomId, { type: "ready-status", ready: { playerA: state.playerA.ready, playerB: state.playerB.ready } });
    if (state.playerA.ready && state.playerB.ready) {
      state.phase = "RUN_PHASE";
      state.demoIndex = 0;
      state.demoEndsAt = Date.now() + DEMO_MS;
      saveRoom(roomId, state);
      pushDemoPhase(roomId, state);
    } else {
      saveRoom(roomId, state);
    }
    return { ok: true };
  }

  if (type === "demo-input" && state.phase === "RUN_PHASE") {
    const demoSlot = state.demoIndex === 0 ? "playerA" : "playerB";
    const playingSlot = demoSlot === "playerA" ? "playerB" : "playerA";
    if (slot !== playingSlot) return { ok: true };
    pushEvent(roomId, { type: "demo-input", event: msg.event });
    return { ok: true };
  }

  if (type === "vote") {
    const voteFor = msg.voteFor === "playerA" || msg.voteFor === "playerB" ? msg.voteFor : null;
    if (voteFor && voteFor !== slot) {
      player.vote = voteFor;
      saveRoom(roomId, state);
      pushEvent(roomId, { type: "vote-update", votes: { playerA: state.playerA.vote, playerB: state.playerB.vote } });
    }
    return { ok: true };
  }

  return { error: `Unknown action: ${type}` };
}

export async function memoryGetPublicRoom(roomId: string) {
  const room = loadRoom(roomId);
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

export async function memorySubmitCode(roomId: string, userId: string, html: string, assets: unknown[]) {
  if (html.length > MAX_HTML_BYTES) {
    return { error: `Submission too large (${html.length} bytes, max ${MAX_HTML_BYTES})` };
  }
  const room = loadRoom(roomId);
  if (!room) return { error: "Room not found" };
  const slot = getSlot(room.state, userId);
  if (!slot) return { error: "Not in room" };
  const player = slot === "playerA" ? room.state.playerA : room.state.playerB;
  player.html = html;
  player.assets = assets;
  saveRoom(roomId, room.state);
  return { ok: true };
}
