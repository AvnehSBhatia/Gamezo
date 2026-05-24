/**
 * Gamezo real-time game server — port 3001
 * Handles matchmaking, phase sync, demo relay, voting, and spectator state.
 */
import http from "http";
import { WebSocketServer } from "ws";
import { pickChaosSeed } from "./chaos-seeds.mjs";

const PORT = parseInt(process.env.PORT ?? process.env.GAME_SERVER_PORT ?? "3001", 10);
const BUILD_MS = 5 * 60 * 1000;
const DEMO_MS = 30 * 1000;
const WAITING_PROMPTS_TIMEOUT_MS = 60 * 1000;
const MAX_HTML_BYTES = 256 * 1024;

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

const appBase = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
const JUDGE_URL =
  process.env.JUDGE_URL ??
  (appBase ? `${trimTrailingSlash(appBase)}/api/ai-judge` : "http://127.0.0.1:3000/api/ai-judge");

/** @type {Map<string, { ws: import('ws').WebSocket, userId: string }>} */
const queue = new Map();

/** @type {Map<string, object>} */
const pendingMatches = new Map();

/** @type {Map<string, Room>} */
const rooms = new Map();

/** @type {Map<string, string>} userId → roomId */
const userRoom = new Map();

/** @type {Map<string, Set<import('ws').WebSocket>>} roomId → spectator sockets */
const spectators = new Map();

/** @type {Map<string, SignalingRoom>} */
const signalingRooms = new Map();

function genRoomId() {
  return `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createPlayer(userId, isBot = false) {
  return {
    userId,
    isBot,
    ws: null,
    promptLocked: false,
    prompt: "",
    ready: false,
    html: "",
    assets: [],
    vote: null,
  };
}

function createRoom(playerAId, playerBId) {
  const id = genRoomId();
  const room = {
    id,
    playerA: createPlayer(playerAId),
    playerB: createPlayer(playerBId),
    phase: "WAITING_PROMPTS",
    chaosSeed: pickChaosSeed(),
    buildEndsAt: null,
    demoIndex: 0,
    demoEndsAt: null,
    judgeResult: null,
    rematchRequests: new Set(),
    createdAt: Date.now(),
  };
  rooms.set(id, room);
  userRoom.set(playerAId, id);
  userRoom.set(playerBId, id);
  scheduleWaitingPromptsTimeout(room);
  return room;
}

function scheduleWaitingPromptsTimeout(room) {
  if (room._waitingPromptsTimer) clearTimeout(room._waitingPromptsTimer);
  room._waitingPromptsTimer = setTimeout(() => {
    if (room.phase !== "WAITING_PROMPTS") return;
    let changed = false;
    for (const p of [room.playerA, room.playerB]) {
      if (!p.promptLocked) {
        p.promptLocked = true;
        if (!p.prompt) p.prompt = pickChaosSeed();
        changed = true;
      }
    }
    if (changed) {
      broadcastRoom(room, {
        type: "prompt-status",
        reason: "timeout",
        promptLocked: { playerA: room.playerA.promptLocked, playerB: room.playerB.promptLocked },
      });
    }
    if (room.playerA.promptLocked && room.playerB.promptLocked && room.phase === "WAITING_PROMPTS") {
      startBuildPhase(room);
    }
  }, WAITING_PROMPTS_TIMEOUT_MS);
}

function getSlot(room, userId) {
  if (room.playerA.userId === userId) return "playerA";
  if (room.playerB.userId === userId) return "playerB";
  return null;
}

function getPlayer(room, slot) {
  return slot === "playerA" ? room.playerA : room.playerB;
}

function getOpponent(room, slot) {
  return slot === "playerA" ? room.playerB : room.playerA;
}

function removeFromQueue(userId) {
  queue.delete(userId);
}

function removeQueueByWs(ws) {
  for (const [userId, entry] of queue) {
    if (entry.ws === ws) removeFromQueue(userId);
  }
}

function buildMatchedPayload(room, userId) {
  const slot = getSlot(room, userId);
  return {
    type: "matched",
    roomId: room.id,
    yourSlot: slot,
    playerA: room.playerA.userId,
    playerB: room.playerB.userId,
    chaosSeed: room.chaosSeed,
    opponentIsBot: room.playerA.isBot || room.playerB.isBot,
  };
}

function notifyMatched(room) {
  for (const [player] of [[room.playerA], [room.playerB]]) {
    if (player.isBot) continue;
    const payload = buildMatchedPayload(room, player.userId);
    pendingMatches.set(player.userId, payload);
    if (player.ws) send(player.ws, payload);
  }
}

function enqueueUser(userId, ws = null) {
  const existingRoomId = userRoom.get(userId);
  if (existingRoomId) {
    const room = rooms.get(existingRoomId);
    if (room) return buildMatchedPayload(room, userId);
  }

  removeFromQueue(userId);
  queue.set(userId, { ws, userId });
  const previewSeed = pickChaosSeed();

  if (tryPairFromQueue()) {
    const room = rooms.get(userRoom.get(userId));
    if (room) return buildMatchedPayload(room, userId);
  }

  return { type: "queued", queueSize: queue.size, previewSeed };
}

function tryPairFromQueue() {
  const entries = [...queue.values()];
  if (entries.length < 2) return false;

  const [a, b] = entries.slice(0, 2);
  removeFromQueue(a.userId);
  removeFromQueue(b.userId);

  const room = createRoom(a.userId, b.userId);
  room.playerA.ws = a.ws;
  room.playerB.ws = b.ws;
  notifyMatched(room);
  return true;
}

function maybeAutoLockBot(room, humanSlot) {
  const opponent = getOpponent(room, humanSlot);
  if (!opponent.isBot || opponent.promptLocked) return;

  setTimeout(() => {
    if (room.phase !== "WAITING_PROMPTS" || opponent.promptLocked) return;
    opponent.promptLocked = true;
    opponent.prompt = pickChaosSeed();
    broadcastRoom(room, {
      type: "prompt-status",
      promptLocked: { playerA: room.playerA.promptLocked, playerB: room.playerB.promptLocked },
    });
    if (room.playerA.promptLocked && room.playerB.promptLocked) {
      startBuildPhase(room);
    }
  }, 1200);
}

function send(ws, msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcastRoom(room, msg, excludeUserId = null) {
  for (const p of [room.playerA, room.playerB]) {
    if (p.userId !== excludeUserId) send(p.ws, msg);
  }
  const specs = spectators.get(room.id);
  if (specs) {
    for (const ws of specs) send(ws, { ...msg, spectator: true });
  }
}

function roomSnapshot(room, forUserId) {
  const slot = getSlot(room, forUserId);
  const opponent = slot === "playerA" ? room.playerB : room.playerA;
  const remainingMs = room.buildEndsAt ? Math.max(0, room.buildEndsAt - Date.now()) : BUILD_MS;
  const demoRemainingMs = room.demoEndsAt ? Math.max(0, room.demoEndsAt - Date.now()) : 0;
  const demoSlot = room.demoIndex === 0 ? "playerA" : "playerB";
  const demoPlayer = getPlayer(room, demoSlot);

  return {
    type: "sync-state",
    roomId: room.id,
    state: room.phase,
    chaosSeed: room.chaosSeed,
    yourSlot: slot,
    remainingMs: room.phase === "BUILD_PHASE" ? remainingMs : 0,
    demoRemainingMs: room.phase === "RUN_PHASE" ? demoRemainingMs : 0,
    demoPlayer: room.phase === "RUN_PHASE" ? demoSlot : null,
    demoHtml: room.phase === "RUN_PHASE" ? demoPlayer.html : null,
    promptLocked: { playerA: room.playerA.promptLocked, playerB: room.playerB.promptLocked },
    ready: { playerA: room.playerA.ready, playerB: room.playerB.ready },
    opponentPromptLocked: opponent.promptLocked,
    submissions: {
      playerA: Boolean(room.playerA.html),
      playerB: Boolean(room.playerB.html),
    },
    judgeResult: room.judgeResult,
    votes: { playerA: room.playerA.vote, playerB: room.playerB.vote },
    shareUrl: `/watch/${room.id}`,
  };
}

function startBuildPhase(room) {
  if (room._waitingPromptsTimer) {
    clearTimeout(room._waitingPromptsTimer);
    room._waitingPromptsTimer = null;
  }
  room.phase = "BUILD_PHASE";
  room.buildEndsAt = Date.now() + BUILD_MS;
  room.playerA.ready = false;
  room.playerB.ready = false;
  broadcastRoom(room, {
    type: "phase-change",
    state: "BUILD_PHASE",
    remainingMs: BUILD_MS,
    chaosSeed: room.chaosSeed,
  });
  scheduleBuildTimer(room);
}

function scheduleBuildTimer(room) {
  if (room._buildTimer) clearTimeout(room._buildTimer);
  room._buildTimer = setTimeout(() => {
    if (room.phase === "BUILD_PHASE") startDemoPhase(room);
  }, BUILD_MS + 200);
}

function startDemoPhase(room) {
  if (room._buildTimer) clearTimeout(room._buildTimer);
  room.phase = "RUN_PHASE";
  room.demoIndex = 0;
  room.demoEndsAt = Date.now() + DEMO_MS;
  broadcastDemoState(room);
  scheduleDemoTick(room);
}

function broadcastDemoState(room) {
  const demoSlot = room.demoIndex === 0 ? "playerA" : "playerB";
  const demoPlayer = getPlayer(room, demoSlot);
  broadcastRoom(room, {
    type: "phase-change",
    state: "RUN_PHASE",
    demoPlayer: demoSlot,
    demoHtml: demoPlayer.html || fallbackHtml(demoPlayer.userId),
    demoRemainingMs: Math.max(0, room.demoEndsAt - Date.now()),
    demoIndex: room.demoIndex,
  });
}

function fallbackHtml(userId) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#111;color:#888;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><p>No game submitted — ${userId.slice(0, 8)} ran out of time.</p></body></html>`;
}

function scheduleDemoTick(room) {
  if (room._demoTimer) clearTimeout(room._demoTimer);
  room._demoTimer = setTimeout(() => {
    if (room.phase !== "RUN_PHASE") return;
    if (room.demoIndex === 0) {
      room.demoIndex = 1;
      room.demoEndsAt = Date.now() + DEMO_MS;
      broadcastDemoState(room);
      scheduleDemoTick(room);
    } else {
      startGradingPhase(room);
    }
  }, DEMO_MS + 200);
}

async function startGradingPhase(room) {
  if (room._demoTimer) clearTimeout(room._demoTimer);
  room.phase = "GRADING";
  broadcastRoom(room, { type: "phase-change", state: "GRADING" });

  try {
    const judgeResult = await runAiJudge(room);
    room.judgeResult = judgeResult;
  } catch (err) {
    console.error("[judge] failed:", err.message);
    room.judgeResult = fallbackJudge(room);
  }

  room.phase = "COMPLETE";
  broadcastRoom(room, {
    type: "grade-complete",
    judgeResult: room.judgeResult,
    votes: { playerA: room.playerA.vote, playerB: room.playerB.vote },
    shareUrl: `/watch/${room.id}`,
  });
}

function fallbackJudge() {
  const score = () => ({
    creativity: 5 + Math.floor(Math.random() * 4),
    fun: 5 + Math.floor(Math.random() * 4),
    chaos: 5 + Math.floor(Math.random() * 4),
    uniqueness: 5 + Math.floor(Math.random() * 4),
  });
  const a = score();
  const b = score();
  const totalA = a.creativity + a.fun + a.chaos + a.uniqueness;
  const totalB = b.creativity + b.fun + b.chaos + b.uniqueness;
  return {
    playerA: { ...a, total: totalA },
    playerB: { ...b, total: totalB },
    winner: totalA >= totalB ? "playerA" : "playerB",
    commentary: "The judge had a moment. Scores are provisional chaos.",
  };
}

async function runAiJudge(room) {
  const res = await fetch(JUDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomId: room.id,
      playerA: { html: room.playerA.html, prompt: room.playerA.prompt },
      playerB: { html: room.playerB.html, prompt: room.playerB.prompt },
    }),
  });
  if (!res.ok) throw new Error(`Judge HTTP ${res.status}`);
  return res.json();
}

function computeWinner(room) {
  const jr = room.judgeResult;
  if (!jr) return null;
  let scoreA = jr.playerA?.total ?? 0;
  let scoreB = jr.playerB?.total ?? 0;
  if (room.playerB.vote === "playerA") scoreA += 10;
  if (room.playerA.vote === "playerB") scoreB += 10;
  return scoreA >= scoreB ? "playerA" : "playerB";
}

function handleGameMessage(ws, msg) {
  const { type, userId } = msg;

  if (type === "enqueue") {
    const result = enqueueUser(userId, ws);
    send(ws, result);
    return;
  }

  if (type === "spectate") {
    const roomId = String(msg.roomId ?? "");
    const room = rooms.get(roomId);
    if (!room) {
      send(ws, { type: "error", message: "Match not found" });
      return;
    }
    if (!spectators.has(roomId)) spectators.set(roomId, new Set());
    spectators.get(roomId).add(ws);
    ws._spectateRoom = roomId;
    send(ws, { type: "spectator-joined", ...publicRoomState(room) });
    return;
  }

  const roomId = String(msg.roomId ?? userRoom.get(userId) ?? "");
  const room = rooms.get(roomId);
  if (!room) {
    send(ws, { type: "error", message: "Room not found" });
    return;
  }

  const slot = getSlot(room, userId);
  if (!slot) {
    send(ws, { type: "error", message: "Not in this room" });
    return;
  }

  const player = getPlayer(room, slot);
  player.ws = ws;

  if (type === "join-room") {
    send(ws, roomSnapshot(room, userId));
    return;
  }

  if (type === "lock-prompt") {
    player.promptLocked = true;
    player.prompt = String(msg.prompt ?? "").slice(0, 200);
    broadcastRoom(room, {
      type: "prompt-status",
      promptLocked: { playerA: room.playerA.promptLocked, playerB: room.playerB.promptLocked },
    });
    if (room.playerA.promptLocked && room.playerB.promptLocked && room.phase === "WAITING_PROMPTS") {
      startBuildPhase(room);
    }
    maybeAutoLockBot(room, slot);
    return;
  }

  if (type === "player-ready") {
    if (room.phase !== "BUILD_PHASE") return;
    player.ready = true;
    const opponent = getOpponent(room, slot);
    if (opponent.isBot) opponent.ready = true;
    broadcastRoom(room, {
      type: "ready-status",
      ready: { playerA: room.playerA.ready, playerB: room.playerB.ready },
    });
    if (room.playerA.ready && room.playerB.ready) startDemoPhase(room);
    return;
  }

  if (type === "demo-input") {
    if (room.phase !== "RUN_PHASE") return;
    const demoSlot = room.demoIndex === 0 ? "playerA" : "playerB";
    const playingSlot = demoSlot === "playerA" ? "playerB" : "playerA";
    if (slot !== playingSlot) return;
    broadcastRoom(room, { type: "demo-input", event: msg.event }, userId);
    return;
  }

  if (type === "vote") {
    if (room.phase !== "GRADING" && room.phase !== "COMPLETE") return;
    const voteFor = msg.voteFor === "playerA" || msg.voteFor === "playerB" ? msg.voteFor : null;
    if (!voteFor || voteFor === slot) return;
    player.vote = voteFor;
    broadcastRoom(room, {
      type: "vote-update",
      votes: { playerA: room.playerA.vote, playerB: room.playerB.vote },
      finalWinner: computeWinner(room),
    });
    return;
  }

  if (type === "rematch") {
    room.rematchRequests.add(userId);
    broadcastRoom(room, { type: "rematch-status", requests: [...room.rematchRequests] });
    if (room.rematchRequests.size >= 2) {
      resetRoomForRematch(room);
    }
    return;
  }

  if (type === "find-new") {
    clearRoomTimers(room);
    for (const p of [room.playerA, room.playerB]) {
      userRoom.delete(p.userId);
      send(p.ws, { type: "return-to-queue" });
    }
    rooms.delete(room.id);
    spectators.delete(room.id);
    return;
  }
}

function clearRoomTimers(room) {
  if (room._waitingPromptsTimer) {
    clearTimeout(room._waitingPromptsTimer);
    room._waitingPromptsTimer = null;
  }
  if (room._buildTimer) {
    clearTimeout(room._buildTimer);
    room._buildTimer = null;
  }
  if (room._demoTimer) {
    clearTimeout(room._demoTimer);
    room._demoTimer = null;
  }
}

function resetRoomForRematch(room) {
  // Cancel any pending build/demo/waiting timers from the previous match
  // before re-arming the new WAITING_PROMPTS timeout — otherwise a stray
  // timer could fire against the reset room.
  clearRoomTimers(room);
  room.phase = "WAITING_PROMPTS";
  room.buildEndsAt = null;
  room.demoIndex = 0;
  room.demoEndsAt = null;
  room.judgeResult = null;
  room.chaosSeed = pickChaosSeed();
  room.rematchRequests.clear();
  for (const p of [room.playerA, room.playerB]) {
    p.promptLocked = false;
    p.prompt = "";
    p.ready = false;
    p.html = "";
    p.assets = [];
    p.vote = null;
  }
  scheduleWaitingPromptsTimeout(room);
  broadcastRoom(room, {
    type: "rematch-start",
    chaosSeed: room.chaosSeed,
    state: "WAITING_PROMPTS",
  });
}

function publicRoomState(room) {
  return {
    roomId: room.id,
    phase: room.phase,
    chaosSeed: room.chaosSeed,
    playerA: room.playerA.userId,
    playerB: room.playerB.userId,
    games: {
      playerA: room.playerA.html || null,
      playerB: room.playerB.html || null,
    },
    prompts: {
      playerA: room.playerA.prompt,
      playerB: room.playerB.prompt,
    },
    judgeResult: room.judgeResult,
    votes: { playerA: room.playerA.vote, playerB: room.playerB.vote },
    finalWinner: computeWinner(room),
    createdAt: room.createdAt,
  };
}

function handleSignalingMessage(ws, msg) {
  const { type, userId, roomId } = msg;
  if (type === "join-room") {
    if (!roomId || !userId) return;
    if (!signalingRooms.has(roomId)) signalingRooms.set(roomId, { peers: new Map() });
    const sr = signalingRooms.get(roomId);

    const existingPeerIds = [...sr.peers.keys()];
    sr.peers.set(userId, ws);
    ws._signalingRoomId = roomId;
    ws._signalingUserId = userId;

    send(ws, { type: "signaling-joined", peerIds: existingPeerIds });

    for (const [peerId, peerWs] of sr.peers) {
      if (peerId !== userId) {
        send(peerWs, { type: "peer-joined", userId, roomId });
      }
    }
    return;
  }

  const sr = signalingRooms.get(roomId);
  if (!sr) return;

  if (type === "offer" || type === "answer" || type === "ice-candidate") {
    for (const [peerId, peerWs] of sr.peers) {
      if (peerId !== userId) send(peerWs, msg);
    }
  }
}

function removeSignalingPeer(ws) {
  const roomId = ws._signalingRoomId;
  const userId = ws._signalingUserId;
  if (!roomId || !userId) return;

  const sr = signalingRooms.get(roomId);
  if (!sr) return;

  sr.peers.delete(userId);
  if (sr.peers.size === 0) signalingRooms.delete(roomId);
}

function handleHttp(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const host = req.headers.host ?? `127.0.0.1:${PORT}`;
  const url = new URL(req.url ?? "/", `http://${host}`);

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, queue: queue.size }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/queue/enqueue") {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const userId = String(data.userId ?? "");
        if (!userId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "userId required" }));
          return;
        }
        const result = enqueueUser(userId, null);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad JSON" }));
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/queue/status") {
    const userId = url.searchParams.get("userId") ?? "";
    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "userId required" }));
      return;
    }
    if (pendingMatches.has(userId)) {
      const payload = pendingMatches.get(userId);
      pendingMatches.delete(userId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
      return;
    }
    const roomId = userRoom.get(userId);
    if (roomId && rooms.has(roomId)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildMatchedPayload(rooms.get(roomId), userId)));
      return;
    }
    if (queue.has(userId)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "queued", queueSize: queue.size }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ type: "idle" }));
    return;
  }

  const submitMatch = url.pathname.match(/^\/session\/([^/]+)\/submit$/);
  if (req.method === "POST" && submitMatch) {
    let body = "";
    let aborted = false;
    req.on("data", (c) => {
      if (aborted) return;
      body += c;
      if (body.length > MAX_HTML_BYTES + 4096) {
        aborted = true;
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Body too large (max ${MAX_HTML_BYTES} bytes)` }));
        // No req.destroy() — emits a socket error that lands in the
        // uncaughtException handler. The `aborted` flag prevents the
        // end-callback parser from running; that's enough.
      }
    });
    req.on("end", () => {
      if (aborted) return;
      try {
        const data = JSON.parse(body);
        const room = rooms.get(submitMatch[1]);
        if (!room) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Room not found" }));
          return;
        }
        const slot = getSlot(room, data.userId);
        if (!slot) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: "Not in room" }));
          return;
        }
        const html = String(data.html ?? "");
        if (html.length > MAX_HTML_BYTES) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Submission too large (max ${MAX_HTML_BYTES} bytes)` }));
          return;
        }
        const player = getPlayer(room, slot);
        player.html = html;
        if (Array.isArray(data.assets)) player.assets = data.assets;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Bad JSON" }));
      }
    });
    return;
  }

  const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/);
  if (req.method === "GET" && sessionMatch) {
    const room = rooms.get(sessionMatch[1]);
    if (!room) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Room not found" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(publicRoomState(room)));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer(handleHttp);
const gameWss = new WebSocketServer({ noServer: true });
const signalWss = new WebSocketServer({ noServer: true });

gameWss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      handleGameMessage(ws, JSON.parse(String(raw)));
    } catch (err) {
      console.error("[game-ws] parse error:", err.message);
    }
  });
  ws.on("close", () => {
    removeQueueByWs(ws);
    if (ws._spectateRoom) {
      spectators.get(ws._spectateRoom)?.delete(ws);
    }
  });
});

signalWss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    try {
      handleSignalingMessage(ws, JSON.parse(String(raw)));
    } catch (err) {
      console.error("[signal-ws] parse error:", err.message);
    }
  });
  ws.on("close", () => removeSignalingPeer(ws));
});

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  if (url.startsWith("/ws/game")) {
    gameWss.handleUpgrade(req, socket, head, (ws) => gameWss.emit("connection", ws, req));
  } else if (url.startsWith("/ws/signaling")) {
    signalWss.handleUpgrade(req, socket, head, (ws) => signalWss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

const HOST = process.env.HOST ?? "0.0.0.0";

/**
 * Log and exit on unhandled errors. Continuing past one is anti-pattern for a
 * stateful in-process server (Node docs are explicit); the process may have
 * left a room mid-phase-transition and silently broken. Exit so a supervisor
 * restarts and clients reconnect, instead of silently wedging matches.
 */
process.on("uncaughtException", (err) => {
  console.error("[game-server] uncaughtException, exiting:", err?.stack ?? err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[game-server] unhandledRejection, exiting:", reason);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[game-server] listening on http://${HOST}:${PORT}`);
});
