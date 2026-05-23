export function getSessionValue(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return sessionStorage.getItem(key) ?? fallback;
}

export function setSessionValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, value);
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "usr_ssr";
  let id = sessionStorage.getItem("gamezo_userId");
  if (!id) {
    id = `usr_${Math.random().toString(36).slice(2, 12)}`;
    sessionStorage.setItem("gamezo_userId", id);
  }
  return id;
}

export function getYourSlot(): "playerA" | "playerB" | null {
  const slot = getSessionValue("gamezo_yourSlot");
  return slot === "playerA" || slot === "playerB" ? slot : null;
}

export function getRoomCode(roomId: string): string {
  if (!roomId) return "MZ8K-7Q2L";
  const cleaned = roomId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `${cleaned.slice(0, 4) || "MZ8K"}-${cleaned.slice(4, 8) || "7Q2L"}`;
}

export function getShareUrl(roomId: string): string {
  if (typeof window === "undefined") return `/watch/${roomId}`;
  return `${window.location.origin}/watch/${roomId}`;
}

export async function copyShareUrl(roomId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getShareUrl(roomId));
    return true;
  } catch {
    return false;
  }
}

export function clearMatchSession() {
  if (typeof window === "undefined") return;
  for (const key of [
    "gamezo_roomId",
    "gamezo_yourSlot",
    "gamezo_playerA",
    "gamezo_playerB",
    "gamezo_chaosSeed",
    "gamezo_judgeResult",
    "gamezo_promptLocked",
  ]) {
    sessionStorage.removeItem(key);
  }
}

export function storeMatchFromWs(msg: Record<string, unknown>) {
  if (msg.roomId) setSessionValue("gamezo_roomId", String(msg.roomId));
  if (msg.yourSlot) setSessionValue("gamezo_yourSlot", String(msg.yourSlot));
  if (msg.playerA) setSessionValue("gamezo_playerA", String(msg.playerA));
  if (msg.playerB) setSessionValue("gamezo_playerB", String(msg.playerB));
  if (msg.chaosSeed) setSessionValue("gamezo_chaosSeed", String(msg.chaosSeed));
}
