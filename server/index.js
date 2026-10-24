import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installGame } from "./game.js";

export function createApp(options = {}) {
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    ...(process.env.APP_ORIGIN
      ? {
          cors: { origin: process.env.APP_ORIGIN },
          allowRequest: (req, callback) =>
            callback(
              null,
              !req.headers.origin ||
                req.headers.origin === process.env.APP_ORIGIN,
            ),
        }
      : {}),
  });
  const game = installGame(io, options);
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, service: "PlotRelay" }),
  );
  const dist = fileURLToPath(new URL("../dist/", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
  return {
    server,
    io,
    game,
    close: () =>
      new Promise((resolve) => {
        game.close();
        io.close(() => server.close(() => resolve()));
      }),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const positive = (value, fallback) =>
    Number(value) > 0 ? Number(value) : fallback;
  const instance = createApp({
    graceMs: positive(process.env.RECONNECT_GRACE_MS, 30_000),
    roomTtlMs: positive(process.env.ROOM_TTL_MS, 3_600_000),
  });
  instance.server.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
    console.log(
      `PlotRelay listening on port ${Number(process.env.PORT) || 3001}`,
    ),
  );
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, async () => {
      await instance.close();
      process.exit(0);
    });
}
