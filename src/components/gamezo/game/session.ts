export function getSessionValue(key: string, fallback = ""): string {
  if (typeof window === "undefined") return fallback;
  return sessionStorage.getItem(key) ?? fallback;
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

export function getRoomCode(roomId: string): string {
  if (!roomId) return "MZ8K-7Q2L";
  const cleaned = roomId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `${cleaned.slice(0, 4) || "MZ8K"}-${cleaned.slice(4, 8) || "7Q2L"}`;
}
