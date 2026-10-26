import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installGame } from "./game.js";

export function createApp({
  appOrigin = process.env.APP_ORIGIN,
  ...options
} = {}) {
  const allowedOrigins = (appOrigin || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
      )
        throw new Error(
          "APP_ORIGIN must contain comma-separated HTTP(S) origins, without paths or credentials.",
        );
      return url.origin;
    });
  const permitsOrigin = (origin) =>
    !origin || !allowedOrigins.length || allowedOrigins.includes(origin);
  const app = express();
  app.disable("x-powered-by");
  const server = createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    cors: {
      origin: (origin, callback) => callback(null, permitsOrigin(origin)),
    },
    allowRequest: (req, callback) =>
      callback(null, permitsOrigin(req.headers.origin)),
  });
  const game = installGame(io, options);
  app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.vary("Origin");
    if (req.headers.origin && permitsOrigin(req.headers.origin))
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.json({ ok: true, service: "PlotRelay" });
  });
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
