# PlotRelay

**One Story. Many Minds. Total Chaos.**

A responsive multiplayer storytelling game for 2–8 friends. React, TypeScript, Vite, Tailwind CSS, Framer Motion, Express and Socket.IO. No accounts, database, payments, external APIs, or generated images.

## Run locally

Use Node.js 22 or 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open port **5173**. Vite proxies Socket.IO and health requests to the Node server on **3001**. To play on multiple devices on the same network, open `http://YOUR_COMPUTER_LAN_IP:5173` on each device and allow those ports through your local firewall. Invitation links use the address where the host opened the site; use a LAN address or public domain, rather than localhost, when inviting another device.

Create a room, copy its invitation link, and invite a second player. Use distinct browsers or browser profiles to simulate multiple players on one machine. Refresh restores the current player from a random token in local storage. Two tabs in the same browser profile share that identity; reconnecting takes over the previous socket.

```sh
npm run build
npm start
```

Production serves both the compiled frontend and Socket.IO on port **3001** (or `PORT`). Health check: `GET /api/health` returns `{"ok":true,"service":"PlotRelay"}`.

## Gameplay

- The host selects the room name, nickname, participant limit and genre. Random resolves to one genre for the room.
- At least two connected players are required. The host starts and writes the opening panel.
- The host goes first, followed by join order. Each player gets one turn, limited to 240 characters.
- Only the active writer receives the immediately preceding panel. Waiting clients receive no contributions. After completion, all players receive the same finished story.
- Twist suggestions are optional predefined prompts; they use no AI service.
- The reveal animates each comic panel. Replay, download a PNG, or share using Web Share where available. Browsers without native sharing download the image instead. Clipboard and native sharing generally require HTTPS outside localhost.
- The host returns the whole room to the lobby for another story. Other players can stay or leave without interrupting everyone else's reveal.
- Disconnected players retain their seat. After 30 seconds, the host can remove them from the lobby or skip their active turn. Skipped players may reconnect to watch the reveal. A disconnected host transfers ownership to the first connected player after the grace period. Explicitly leaving transfers hosting immediately and advances an active turn.

## Tests

```sh
npm test                 # independent real Socket.IO clients, actual HTTP server
npm run build            # TypeScript validation and production bundle
npm run test:browser     # independent desktop/mobile Chromium contexts
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to a Chromium executable on your machine; for example install Playwright Chromium with `npx playwright install chromium` and supply its executable path. The runner starts the production server automatically, so build first. Screenshots and the exported comic are written to `/tmp/plotrelay-*.png`. Browser tests cover room creation, invitation joining, live lobby updates, private turns, refresh, twist suggestions, shared final story, replay, image download, restarting, and narrow-screen overflow. Server tests additionally cover capacity, invalid sessions, unauthorized turns, duplicate submissions, host transfer, grace periods, skipping, leaving, room cleanup, and message rate limiting.

## Deploy on a persistent Node host

Use a Node web service such as Render, Railway, Fly.io, or a VM with a process supervisor. Configure:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health path: `/api/health`
- One process / one replica, with a persistent running service (no scale-to-zero for an uninterrupted game).
- HTTPS on the public domain. Forward both HTTP and WebSocket traffic to `PORT`; proxies must forward WebSocket upgrade headers. Keep proxy timeouts above Socket.IO's heartbeat window (60 seconds or more).
- Optional `APP_ORIGIN=https://your-domain.example` restricts browser socket origins to your public frontend. Do not include a trailing slash. Leave unset for the local Vite proxy workflow.

A Dockerfile is included. Build with `docker build -t plotrelay .` and run with `docker run --rm -p 3001:3001 -e APP_ORIGIN=https://your-domain.example plotrelay`. Docker deployment is documented, not validated in the cloud workspace.

### Configuration

| Variable             | Default             | Purpose                                          |
| -------------------- | ------------------- | ------------------------------------------------ |
| `PORT`               | `3001`              | HTTP and Socket.IO listener                      |
| `APP_ORIGIN`         | unset               | Optional permitted browser origin                |
| `RECONNECT_GRACE_MS` | `30000`             | Host transfer / disconnected-player skip delay   |
| `ROOM_TTL_MS`        | `3600000`           | Remove rooms after this much gameplay inactivity |
| `CHROMIUM_PATH`      | `/usr/bin/chromium` | Browser test executable only                     |

No credentials are required. **All rooms and stories live in server memory and disappear on restart or deployment.** Inactive rooms expire even if their browser tabs remain open. This prototype cannot be horizontally scaled without introducing a shared room store and coordination. Live processes do not survive cloud environment snapshots; start the server again in new tasks.

## Architecture and security boundaries

- `server/game.js`: transport handlers, authoritative room state, per-player projections, reconnect and cleanup lifecycle.
- `server/index.js`: HTTP server, static production hosting, Socket.IO transport, health endpoint.
- `src/main.tsx`: reusable avatars, comics, room forms, lobby, writing, waiting and reveal components.
- `src/export.ts`: canvas-rendered PNG export with variable-height panels, including long words and multiline text.
- `src/styles.css`: responsive theme and comic artwork; reduced-motion support.
- `tests/`: server integration tests and browser journeys.

Room codes use 40 bits of randomness; reconnect tokens use 256 bits. Tokens are returned only to their player and never broadcast. Inputs are type/length validated, socket packets capped at 8 KB, and messages rate limited per connection and transport IP. User text is rendered as React text or drawn to canvas, never injected as HTML. One socket can occupy one identity at a time. Room count is bounded to 1,000.

This is a prototype: behind a reverse proxy, transport-IP limits may apply to many users together; tune this before a large public launch. There is no account recovery or moderation service. Anyone with an invitation code may join an open lobby. Browser storage is the reconnect credential, so use a separate profile on shared devices. Store and game engine boundaries can be extracted into a shared persistence layer and reused by a future mobile client.
