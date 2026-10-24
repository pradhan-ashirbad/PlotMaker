import { randomBytes } from "node:crypto";

export const GENRES = [
  "Comedy",
  "Horror",
  "Mystery",
  "Fantasy",
  "Sci-Fi",
  "Random",
];
const clean = (value, max, label) => {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)
  )
    throw new Error(`${label} must be 1–${max} characters.`);
  return value.trim();
};

export function installGame(
  io,
  {
    graceMs = 30_000,
    roomTtlMs = 3_600_000,
    sweepMs = 1000,
    maxRooms = 1000,
  } = {},
) {
  const rooms = new Map();
  const ipLimits = new Map();
  function view(room, viewer) {
    const current = room.players[room.turn];
    return {
      code: room.code,
      name: room.name,
      genre: room.genre,
      maxPlayers: room.maxPlayers,
      hostId: room.hostId,
      status: room.status,
      you: viewer.id,
      turn: room.turn,
      currentPlayerId: current?.id,
      completed: room.panels.length,
      players: room.players.map(
        ({ id, nickname, connected, disconnectedAt, left, skipped }) => ({
          id,
          nickname,
          connected,
          left,
          skipped,
          skipAt: disconnectedAt ? disconnectedAt + graceMs : null,
        }),
      ),
      previous:
        room.status === "writing" && current?.id === viewer.id
          ? (room.panels.at(-1) ?? null)
          : null,
      panels: room.status === "reveal" ? room.panels : [],
    };
  }
  function broadcast(room, event = "room:state") {
    for (const player of room.players)
      if (player.socketId) {
        const state = view(room, player);
        io.to(player.socketId).emit("room:state", state);
        if (event !== "room:state") io.to(player.socketId).emit(event, state);
      }
  }
  function transfer(room) {
    const next = room.players.find((p) => p.connected && !p.left);
    if (next) room.hostId = next.id;
  }
  function advance(room) {
    room.turn++;
    while (
      room.turn < room.players.length &&
      (room.players[room.turn].left || room.players[room.turn].skipped)
    )
      room.turn++;
    if (room.turn >= room.players.length) room.status = "reveal";
    room.updatedAt = Date.now();
    broadcast(
      room,
      room.status === "reveal" ? "story:complete" : "story:nextTurn",
    );
  }
  function get(socket) {
    const room = rooms.get(socket.data.roomCode);
    const player = room?.players.find(
      (p) =>
        p.id === socket.data.playerId && p.socketId === socket.id && !p.left,
    );
    if (!room || !player)
      throw new Error("Your room session has ended. Join a room to continue.");
    return { room, player };
  }
  function bind(socket, room, player) {
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    player.socketId = socket.id;
    player.connected = true;
    player.disconnectedAt = null;
    room.updatedAt = Date.now();
  }
  function leave(socket, permanent = false) {
    let session;
    try {
      session = get(socket);
    } catch {
      return;
    }
    const { room, player } = session;
    player.socketId = null;
    player.connected = false;
    player.disconnectedAt = Date.now();
    socket.data.roomCode = null;
    socket.data.playerId = null;
    if (permanent) {
      player.left = true;
      player.token = null;
      if (room.status === "lobby")
        room.players = room.players.filter((p) => p.id !== player.id);
      if (room.hostId === player.id) transfer(room);
      if (
        room.status === "writing" &&
        room.players[room.turn]?.id === player.id
      )
        advance(room);
    }
    room.updatedAt = Date.now();
    broadcast(room, "player:disconnect");
    if (!room.players.length || room.players.every((p) => p.left))
      rooms.delete(room.code);
  }
  io.on("connection", (socket) => {
    let budget = 0,
      windowStart = Date.now();
    function handle(event, fn) {
      socket.on(event, (data, ack) => {
        if (typeof ack !== "function") return;
        try {
          if (Date.now() - windowStart > 10_000) {
            budget = 0;
            windowStart = Date.now();
          }
          if (++budget > 35)
            throw new Error(
              "Slow down a little. Please try again in a few seconds.",
            );
          const address = socket.handshake.address;
          let limit = ipLimits.get(address);
          if (!limit || Date.now() - limit.start > 10_000) {
            limit = { start: Date.now(), count: 0 };
            ipLimits.set(address, limit);
          }
          if (++limit.count > 200)
            throw new Error("Too many requests. Please try again shortly.");
          const result = fn(data && typeof data === "object" ? data : {});
          ack({ ok: true, ...result });
        } catch (error) {
          ack({ ok: false, error: error.message });
        }
      });
    }
    handle("room:create", (data) => {
      if (socket.data.roomCode)
        throw new Error("Leave your current room first.");
      if (rooms.size >= maxRooms)
        throw new Error("The server is full. Please try again later.");
      const name = clean(data.name, 48, "Room name");
      const nickname = clean(data.nickname, 20, "Nickname");
      if (
        !Number.isInteger(data.maxPlayers) ||
        data.maxPlayers < 2 ||
        data.maxPlayers > 8 ||
        !GENRES.includes(data.genre)
      )
        throw new Error("Choose a valid genre and 2–8 players.");
      let code;
      do {
        code = randomBytes(5).toString("hex").toUpperCase();
      } while (rooms.has(code));
      const player = {
        id: randomBytes(12).toString("hex"),
        token: randomBytes(32).toString("hex"),
        nickname,
        left: false,
        skipped: false,
      };
      const room = {
        code,
        name,
        genre:
          data.genre === "Random"
            ? GENRES[Math.floor(Math.random() * 5)]
            : data.genre,
        maxPlayers: data.maxPlayers,
        hostId: player.id,
        players: [player],
        panels: [],
        turn: 0,
        status: "lobby",
        updatedAt: Date.now(),
      };
      rooms.set(code, room);
      bind(socket, room, player);
      broadcast(room);
      return { code, token: player.token };
    });
    handle("room:join", (data) => {
      if (socket.data.roomCode)
        throw new Error("Leave your current room first.");
      const code = clean(data.code, 10, "Room code").toUpperCase();
      const room = rooms.get(code);
      if (!room)
        throw new Error("Room not found. Check the code or create a new room.");
      if (room.status !== "lobby")
        throw new Error(
          "This story has already started. Join when the room returns to the lobby.",
        );
      if (room.players.length >= room.maxPlayers)
        throw new Error("This room is full.");
      const nickname = clean(data.nickname, 20, "Nickname");
      if (
        room.players.some(
          (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
        )
      )
        throw new Error("That nickname is taken in this room. Try another.");
      const player = {
        id: randomBytes(12).toString("hex"),
        token: randomBytes(32).toString("hex"),
        nickname,
        left: false,
        skipped: false,
      };
      room.players.push(player);
      bind(socket, room, player);
      broadcast(room);
      return { code, token: player.token };
    });
    handle("player:reconnect", (data) => {
      if (typeof data.token !== "string" || typeof data.code !== "string")
        throw new Error("Invalid session.");
      const room = rooms.get(data.code);
      const player = room?.players.find(
        (p) => p.token === data.token && !p.left,
      );
      if (!player)
        throw new Error(
          "Your previous room has expired. Create or join a new room.",
        );
      if (
        socket.data.roomCode &&
        (socket.data.roomCode !== room.code ||
          socket.data.playerId !== player.id)
      )
        throw new Error("Leave your current room first.");
      if (player.socketId && player.socketId !== socket.id) {
        const old = io.sockets.sockets.get(player.socketId);
        if (old) {
          old.data = {};
          old.emit("session:replaced");
          old.disconnect(true);
        }
      }
      bind(socket, room, player);
      broadcast(room, "player:reconnect");
      return { code: room.code, token: player.token };
    });
    handle("room:leave", () => {
      leave(socket, true);
    });
    handle("game:start", () => {
      const { room, player } = get(socket);
      if (room.hostId !== player.id)
        throw new Error("Only the host can start the story.");
      if (room.status !== "lobby")
        throw new Error("The game has already started.");
      if (room.players.filter((p) => p.connected).length < 2)
        throw new Error("At least two connected players are needed.");
      if (room.players.some((p) => !p.connected))
        throw new Error(
          "Wait for disconnected players to return, or remove them after the grace period.",
        );
      room.players = [
        player,
        ...room.players.filter((p) => p.id !== player.id),
      ];
      room.players.forEach((p) => {
        p.skipped = false;
      });
      room.status = "writing";
      room.turn = 0;
      room.panels = [];
      room.updatedAt = Date.now();
      broadcast(room, "story:nextTurn");
    });
    handle("story:submit", (data) => {
      const { room, player } = get(socket);
      if (
        room.status !== "writing" ||
        room.players[room.turn]?.id !== player.id
      )
        throw new Error("It is not your turn.");
      const text = clean(data.text, 240, "Story panel");
      room.panels.push({
        text,
        author: player.nickname,
        playerId: player.id,
        number: room.panels.length + 1,
      });
      advance(room);
    });
    handle("player:skip", (data) => {
      const { room, player } = get(socket);
      if (player.id !== room.hostId)
        throw new Error("Only the host can skip a disconnected player.");
      const target = room.players.find(
        (p) => p.id === data.playerId && !p.left,
      );
      if (
        !target ||
        target.connected ||
        !target.disconnectedAt ||
        Date.now() < target.disconnectedAt + graceMs
      )
        throw new Error("Wait for the reconnect grace period to finish.");
      if (room.status === "lobby") {
        target.token = null;
        room.players = room.players.filter((p) => p !== target);
        broadcast(room);
      } else if (
        room.status === "writing" &&
        room.players[room.turn] === target
      ) {
        target.skipped = true;
        advance(room);
      } else throw new Error("Only the current writer can be skipped.");
    });
    handle("game:reset", () => {
      const { room, player } = get(socket);
      if (player.id !== room.hostId || room.status !== "reveal")
        throw new Error(
          "The host can return everyone to the lobby after the reveal.",
        );
      room.players = room.players.filter((p) => p.connected && !p.left);
      room.players.forEach((p) => {
        p.skipped = false;
      });
      room.status = "lobby";
      room.turn = 0;
      room.panels = [];
      room.updatedAt = Date.now();
      broadcast(room);
    });
    socket.on("disconnect", () => leave(socket));
  });
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [address, limit] of ipLimits)
      if (now - limit.start > 60_000) ipLimits.delete(address);
    for (const room of rooms.values()) {
      if (now - room.updatedAt > roomTtlMs) {
        for (const p of room.players)
          if (p.socketId) {
            const s = io.sockets.sockets.get(p.socketId);
            if (s) {
              s.data = {};
              s.emit("room:expired");
            }
          }
        rooms.delete(room.code);
        continue;
      }
      const host = room.players.find((p) => p.id === room.hostId);
      if (
        !host?.connected &&
        (!host || host.left || now - host.disconnectedAt >= graceMs)
      ) {
        const old = room.hostId;
        transfer(room);
        if (old !== room.hostId) broadcast(room);
      }
    }
  }, sweepMs);
  timer.unref();
  return { rooms, close: () => clearInterval(timer) };
}
