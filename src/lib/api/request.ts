/**
 * Plain fetch wrapper for anonymous Gamezo API calls.
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, init);
}
