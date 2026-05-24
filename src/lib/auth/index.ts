export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

/**
 * Gamezo runs anonymous-direct — there is no login, no session, no identity
 * verification. Every request is accepted. Clients that want stable per-user
 * features (MCP tool scoping, profile upserts) may pass an opaque local
 * identifier via the `x-user-id` header; nothing about it is trusted, it's
 * purely a client-chosen handle.
 */
export function requireAuth(request: Request): AuthResult {
  const headerId = request.headers.get("x-user-id")?.trim();
  return {
    ok: true,
    user: {
      id: headerId && headerId.length > 0 ? headerId : "anonymous",
      email: null,
      name: null,
      avatarUrl: null,
    },
  };
}
