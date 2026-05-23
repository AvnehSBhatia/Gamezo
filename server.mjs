import crypto from "crypto";
import http from "http";
import { config } from "dotenv";
import next from "next";
import postgres from "postgres";
import { WebSocketServer } from "ws";

config({ path: ".env" });

const dev = process.env.NODE_ENV !== "production";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const buildMs = Number.parseInt(process.env.GAMEZO_BUILD_MS ?? "300000", 10);
const demoMs = Number.parseInt(process.env.GAMEZO_DEMO_MS ?? "45000", 10);

const app = next({ dev, dir: process.cwd() });
const handle = app.getRequestHandler();

const gameWss = new WebSocketServer({ noServer: true });
const signalingWss = new WebSocketServer({ noServer: true });

/** @type {Map<string, import("ws").WebSocket>} */
const gameClients = new Map();
/** @type {Map<string, Set<import("ws").WebSocket>>} */
const signalingRooms = new Map();
/** @type {Array<{ userId: string, ws: import("ws").WebSocket }>} */
const queue = [];
/** @type {Map<string, any>} */
const rooms = new Map();

let sql = null;
if (process.env.DATABASE_URL) {
  sql = postgres(process.env.DATABASE_URL, { max: 2 });
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function token() {
  return crypto.randomBytes(24).toString("base64url");
}

function slotFor(room, userId) {
  if (room.players.playerA === userId) return "playerA";
  if (room.players.playerB === userId) return "playerB";
  return null;
}

function publicRoom(room) {
  return {
    roomId: room.roomId,
    phase: room.phase,
    players: room.players,
    submissions: room.submissions,
    votes: room.votes,
    judgingResult: room.judgingResult,
    createdAt: room.createdAt,
  };
}

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendToUser(userId, message) {
  const ws = gameClients.get(userId);
  if (ws) send(ws, message);
}

function broadcast(room, message) {
  sendToUser(room.players.playerA, message);
  sendToUser(room.players.playerB, message);
}

async function persistRoom(room) {
  if (!sql) return;
  try {
    await sql`
      insert into gamezo_matches (id, phase, player_a_id, player_b_id, state, created_at, updated_at, completed_at)
      values (
        ${room.roomId},
        ${room.phase},
        ${room.players.playerA},
        ${room.players.playerB},
        ${JSON.stringify(publicRoom(room))}::jsonb,
        ${room.createdAt},
        now(),
        ${room.phase === "COMPLETE" ? nowIso() : null}
      )
      on conflict (id) do update set
        phase = excluded.phase,
        state = excluded.state,
        updated_at = now(),
        completed_at = excluded.completed_at
    `;
  } catch (err) {
    console.warn("[gamezo-db] persist failed", err instanceof Error ? err.message : err);
  }
}

async function loadRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);
  if (!sql) return null;
  try {
    const rows = await sql`select state from gamezo_matches where id = ${roomId} limit 1`;
    const state = rows[0]?.state;
    if (!state) return null;
    const room = {
      ...state,
      tokens: {},
      ready: {},
      phaseEndsAt: null,
      timers: [],
    };
    rooms.set(room.roomId, room);
    return room;
  } catch (err) {
    console.warn("[gamezo-db] load failed", err instanceof Error ? err.message : err);
    return null;
  }
}

async function initDb() {
  if (!sql) return;
  try {
    await sql`
      create table if not exists gamezo_matches (
        id varchar(128) primary key,
        phase varchar(32) not null,
        player_a_id varchar(128) not null,
        player_b_id varchar(128) not null,
        state jsonb not null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now(),
        completed_at timestamp
      )
    `;
    await sql`create index if not exists gamezo_matches_phase_idx on gamezo_matches (phase)`;
    await sql`
      create table if not exists gamezo_anonymous_players (
        id varchar(128) primary key,
        display_name text,
        created_at timestamp not null default now()
      )
    `;
    await sql`
      create table if not exists gamezo_submissions (
        id varchar(160) primary key,
        match_id varchar(128) not null,
        player_id varchar(128) not null,
        slot varchar(16) not null,
        html text not null,
        created_at timestamp not null default now()
      )
    `;
    await sql`create index if not exists gamezo_submissions_match_idx on gamezo_submissions (match_id)`;
    await sql`
      create table if not exists gamezo_votes (
        id varchar(160) primary key,
        match_id varchar(128) not null,
        voter_id varchar(128) not null,
        voted_for_slot varchar(16) not null,
        created_at timestamp not null default now()
      )
    `;
    await sql`create index if not exists gamezo_votes_match_idx on gamezo_votes (match_id)`;
    await sql`
      create table if not exists gamezo_judging_results (
        match_id varchar(128) primary key,
        winner_slot varchar(16) not null,
        result jsonb not null,
        created_at timestamp not null default now()
      )
    `;
  } catch (err) {
    console.warn("[gamezo-db] init failed", err instanceof Error ? err.message : err);
  }
}

function setPhase(room, phase, durationMs = 0) {
  room.phase = phase;
  room.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : null;
  for (const timer of room.timers) clearTimeout(timer);
  room.timers = [];

  const message = {
    type: "phase-change",
    roomId: room.roomId,
    state: phase,
    remainingMs: durationMs,
  };
  broadcast(room, message);
  void persistRoom(room);

  if (phase === "BUILD_PHASE") {
    room.timers.push(setTimeout(() => startDemo(room, "playerA"), durationMs));
  } else if (phase === "PLAYER_A_DEMO") {
    room.timers.push(setTimeout(() => startDemo(room, "playerB"), durationMs));
  } else if (phase === "PLAYER_B_DEMO") {
    room.timers.push(setTimeout(() => setPhase(room, "VOTING"), durationMs));
  }
}

function startDemo(room, slot) {
  setPhase(room, slot === "playerA" ? "PLAYER_A_DEMO" : "PLAYER_B_DEMO", demoMs);
}

function matchPlayers(a, b) {
  const roomId = id("room");
  const room = {
    roomId,
    phase: "ROOM_READY",
    players: { playerA: a.userId, playerB: b.userId },
    tokens: { [a.userId]: token(), [b.userId]: token() },
    ready: {},
    submissions: {},
    votes: {},
    judgingResult: null,
    createdAt: nowIso(),
    phaseEndsAt: null,
    timers: [],
  };
  rooms.set(roomId, room);

  for (const [slot, userId] of Object.entries(room.players)) {
    sendToUser(userId, {
      type: "matched",
      roomId,
      yourSlot: slot,
      playerA: room.players.playerA,
      playerB: room.players.playerB,
      matchToken: room.tokens[userId],
    });
  }
  broadcast(room, { type: "phase-change", roomId, state: "ROOM_READY", remainingMs: 0 });
  void persistRoom(room);
  room.timers.push(setTimeout(() => setPhase(room, "BUILD_PHASE", buildMs), 1200));
}

function syncRoom(ws, room, userId) {
  const remainingMs = room.phaseEndsAt ? Math.max(0, room.phaseEndsAt - Date.now()) : 0;
  send(ws, {
    type: "sync-state",
    roomId: room.roomId,
    state: room.phase,
    remainingMs,
    players: room.players,
    yourSlot: slotFor(room, userId),
    submissions: room.submissions,
    votes: room.votes,
    judgingResult: room.judgingResult,
  });
}

async function handleGameMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return send(ws, { type: "error", message: "Invalid JSON" });
  }

  const userId = String(msg.userId ?? "");
  if (userId) gameClients.set(userId, ws);

  if (msg.type === "enqueue") {
    if (!userId) return send(ws, { type: "error", message: "Missing userId" });
    const waitingIndex = queue.findIndex((item) => item.userId !== userId && item.ws.readyState === item.ws.OPEN);
    if (waitingIndex === -1) {
      queue.push({ userId, ws });
      return send(ws, { type: "queued" });
    }
    const opponent = queue.splice(waitingIndex, 1)[0];
    return matchPlayers(opponent, { userId, ws });
  }

  const roomId = String(msg.roomId ?? "");
  const room = await loadRoom(roomId);
  if (!room) return send(ws, { type: "error", message: "Unknown room" });

  if (msg.type === "join-room") {
    return syncRoom(ws, room, userId);
  }

  const slot = slotFor(room, userId);
  if (!slot) return send(ws, { type: "error", message: "User is not in this room" });

  if (msg.type === "player-ready") {
    room.ready[slot] = true;
    broadcast(room, { type: "ready-update", ready: room.ready });
    if (room.phase === "BUILD_PHASE" && room.ready.playerA && room.ready.playerB) {
      startDemo(room, "playerA");
    }
    return persistRoom(room);
  }

  if (msg.type === "submit-game") {
    const html = String(msg.html ?? "").slice(0, 200000);
    room.submissions[slot] = { userId, slot, html, submittedAt: nowIso() };
    if (sql) {
      await sql`
        insert into gamezo_submissions (id, match_id, player_id, slot, html)
        values (${`${room.roomId}:${slot}`}, ${room.roomId}, ${userId}, ${slot}, ${html})
        on conflict (id) do update set html = excluded.html, created_at = now()
      `.catch((err) => console.warn("[gamezo-db] submission failed", err.message));
    }
    broadcast(room, { type: "submission-update", slot, submitted: true });
    if (room.submissions.playerA && room.submissions.playerB && room.ready.playerA && room.ready.playerB) {
      startDemo(room, "playerA");
    }
    return persistRoom(room);
  }

  if (msg.type === "chat-message") {
    return broadcast(room, { type: "chat-message", from: userId, text: String(msg.text ?? "").slice(0, 500) });
  }

  if (msg.type === "demo-input") {
    const target = slot === "playerA" ? room.players.playerB : room.players.playerA;
    return sendToUser(target, { type: "demo-input", from: slot, event: msg.event });
  }

  if (msg.type === "vote") {
    const votedFor = msg.votedFor === "playerA" ? "playerA" : "playerB";
    room.votes[userId] = votedFor;
    if (sql) {
      await sql`
        insert into gamezo_votes (id, match_id, voter_id, voted_for_slot)
        values (${`${room.roomId}:${userId}`}, ${room.roomId}, ${userId}, ${votedFor})
        on conflict (id) do update set voted_for_slot = excluded.voted_for_slot, created_at = now()
      `.catch((err) => console.warn("[gamezo-db] vote failed", err.message));
    }
    broadcast(room, { type: "vote-update", votes: room.votes });
    return persistRoom(room);
  }

  if (msg.type === "rematch") {
    queue.push({ userId, ws });
    return send(ws, { type: "queued" });
  }
}

function handleSignalingMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }
  const roomId = String(msg.roomId ?? "");
  if (!roomId) return;

  if (msg.type === "join-room") {
    let peers = signalingRooms.get(roomId);
    if (!peers) {
      peers = new Set();
      signalingRooms.set(roomId, peers);
    }
    peers.add(ws);
    ws.__gamezoRoomId = roomId;
    send(ws, { type: "signaling-joined" });
    return;
  }

  const peers = signalingRooms.get(roomId);
  if (!peers) return;
  for (const peer of peers) {
    if (peer !== ws) send(peer, msg);
  }
}

globalThis.__GAMEZO_RUNTIME = {
  async validateAction({ roomId, userId, matchToken, allowedPhases }) {
    const room = await loadRoom(roomId);
    if (!room) return { ok: false, error: "Unknown match", status: 404 };
    if (!slotFor(room, userId)) return { ok: false, error: "User is not in this match", status: 403 };
    if (room.tokens[userId] && room.tokens[userId] !== matchToken) {
      return { ok: false, error: "Invalid match token", status: 403 };
    }
    if (allowedPhases && !allowedPhases.includes(room.phase)) {
      return { ok: false, error: `Action is not allowed during ${room.phase}`, status: 409 };
    }
    return { ok: true };
  },
  async getPublicMatch(roomId) {
    const room = await loadRoom(roomId);
    return room ? publicRoom(room) : null;
  },
  async saveJudgingResult(roomId, result) {
    const room = await loadRoom(roomId);
    if (!room) return;
    room.judgingResult = result;
    setPhase(room, "COMPLETE");
    if (!sql) return;
    await sql`
      insert into gamezo_judging_results (match_id, winner_slot, result)
      values (${roomId}, ${result.winner}, ${JSON.stringify(result)}::jsonb)
      on conflict (match_id) do update set winner_slot = excluded.winner_slot, result = excluded.result
    `.catch((err) => console.warn("[gamezo-db] judging failed", err.message));
  },
};

app.prepare().then(async () => {
  await initDb();
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (url.startsWith("/ws/game")) {
      gameWss.handleUpgrade(req, socket, head, (ws) => gameWss.emit("connection", ws, req));
      return;
    }
    if (url.startsWith("/ws/signaling")) {
      signalingWss.handleUpgrade(req, socket, head, (ws) => signalingWss.emit("connection", ws, req));
      return;
    }
    socket.destroy();
  });

  gameWss.on("connection", (ws) => {
    ws.on("message", (raw) => void handleGameMessage(ws, raw));
    ws.on("close", () => {
      for (const [userId, client] of gameClients.entries()) {
        if (client === ws) gameClients.delete(userId);
      }
      const index = queue.findIndex((item) => item.ws === ws);
      if (index !== -1) queue.splice(index, 1);
    });
  });

  signalingWss.on("connection", (ws) => {
    ws.on("message", (raw) => handleSignalingMessage(ws, raw));
    ws.on("close", () => {
      const roomId = ws.__gamezoRoomId;
      if (!roomId) return;
      const peers = signalingRooms.get(roomId);
      peers?.delete(ws);
      if (peers?.size === 0) signalingRooms.delete(roomId);
    });
  });

  server.listen(port, () => {
    console.log(`> Gamezo ready on http://localhost:${port}`);
  });
});
