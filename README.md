# Gamezo

Gamezo is a head-to-head AI game builder. Two anonymous players are matched into a room, use AI to build tiny sandboxed HTML games, submit when ready, demo each game, vote, and receive an AI judge result.

## Getting Started

Install dependencies with Bun:

```bash
bun install --frozen-lockfile
```

Start the app with the custom server. This is required because the app hosts its own `/ws/game` and `/ws/signaling` WebSocket endpoints:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in two browser windows to test matchmaking.

## Environment Variables

Copy `.env.example` to `.env` and fill in deployment-specific values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `EAZO_PRIVATE_KEY` | Private key used by the Eazo SDK on server-side routes. Never commit a real value. |
| `EAZO_APP_ID` | Eazo app id for platform capabilities. |
| `DATABASE_URL` | Optional PostgreSQL URL. When set, Gamezo persists match snapshots, submissions, votes, and judging results. |
| `GAMEZO_BUILD_MS` | Optional build phase duration in milliseconds. Defaults to `300000`. |
| `GAMEZO_DEMO_MS` | Optional per-player demo duration in milliseconds. Defaults to `45000`. |
| `NEXT_PUBLIC_TURN_URL` | Optional TURN server URL for WebRTC outside local networks. |
| `NEXT_PUBLIC_TURN_USERNAME` | Optional TURN username. |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Optional TURN credential. |
| `CRON_SECRET` | Shared secret for notification cron endpoints. |

## Verification

```bash
bun run lint
bun run build
```

## Security Note

The development `.env` file is ignored by git. If a real `EAZO_PRIVATE_KEY` was shared in any archive or external channel, rotate it before deploying.
