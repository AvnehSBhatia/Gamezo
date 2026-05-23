export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

/** Anonymous Gamezo — auth is not used; always rejects missing session. */
export function requireAuth(request: Request): AuthResult {
  void request;
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: "Authentication is not enabled" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  };
}
