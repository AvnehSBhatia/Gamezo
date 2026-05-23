export interface GameSubmissionPayload {
  roomId: string;
  userId: string;
  html: string;
}

export async function submitGameCode({ roomId, userId, html }: GameSubmissionPayload): Promise<void> {
  if (!roomId || !html) return;

  const backend = process.env.NEXT_PUBLIC_BACKEND_HTTP_URL ?? "http://localhost:3001";
  await fetch(`${backend}/session/${roomId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, html, css: "", js: "", assets: [] }),
  });
}
