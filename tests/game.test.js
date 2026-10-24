import test from "node:test";
import assert from "node:assert/strict";
import { io as connect } from "socket.io-client";
import { createApp } from "../server/index.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (socket, event, data = {}) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(event, data, (error, result) =>
        error ? reject(error) : resolve(result),
      ),
  );
async function waitFor(check, ms = 2500) {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("State did not arrive");
    await sleep(10);
  }
}
async function fixture(t, options = {}) {
  const app = createApp({ graceMs: 80, sweepMs: 10, ...options });
  await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
  const clients = [];
  t.after(async () => {
    clients.forEach((s) => s.disconnect());
    await app.close();
  });
  async function client() {
    const s = connect(`http://127.0.0.1:${app.server.address().port}`, {
      forceNew: true,
      reconnection: false,
    });
    s.on("room:state", (state) => {
      s.state = state;
    });
    clients.push(s);
    await new Promise((resolve) => s.on("connect", resolve));
    return s;
  }
  const host = await client();
  const created = await call(host, "room:create", {
    name: "Test Story",
    nickname: "Host",
    genre: "Comedy",
    maxPlayers: 3,
  });
  assert.equal(created.ok, true);
  return { app, host, created, client };
}

test("real clients: create, join, private turns, authorization, duplicate protection, reveal and restart", async (t) => {
  const { host, created, client } = await fixture(t);
  assert.match(created.code, /^[A-F0-9]{10}$/);
  assert.match(created.token, /^[a-f0-9]{64}$/);
  assert.equal((await call(host, "game:start")).ok, false);
  const guest = await client(),
    third = await client();
  assert.equal(
    (await call(guest, "room:join", { code: created.code, nickname: "Guest" }))
      .ok,
    true,
  );
  assert.equal(
    (await call(third, "room:join", { code: created.code, nickname: "Third" }))
      .ok,
    true,
  );
  await waitFor(() => host.state.players.length === 3);
  assert.equal(JSON.stringify(host.state).includes(created.token), false);
  assert.equal((await call(guest, "game:start")).ok, false);
  assert.equal((await call(host, "game:start")).ok, true);
  assert.equal(
    (await call(guest, "story:submit", { text: "Sneaking in" })).ok,
    false,
  );
  assert.equal(
    (await call(host, "story:submit", { text: "x".repeat(241) })).ok,
    false,
  );
  assert.equal((await call(host, "story:submit", { text: "  " })).ok, false);
  assert.equal(
    (await call(host, "story:submit", { text: "Secret opening" })).ok,
    true,
  );
  assert.equal(
    (await call(host, "story:submit", { text: "Duplicate" })).ok,
    false,
  );
  await waitFor(() => guest.state.previous?.text === "Secret opening");
  assert.deepEqual(host.state.panels, []);
  assert.equal(host.state.previous, null);
  assert.equal(third.state.previous, null);
  assert.equal(
    (await call(guest, "story:submit", { text: "Secret middle" })).ok,
    true,
  );
  await waitFor(() => third.state.previous?.text === "Secret middle");
  assert.equal(JSON.stringify(third.state).includes("Secret opening"), false);
  assert.equal(
    (
      await call(third, "story:submit", {
        text: '<script>alert("end")</script>',
      })
    ).ok,
    true,
  );
  await waitFor(() =>
    [host, guest, third].every((s) => s.state.status === "reveal"),
  );
  assert.equal(host.state.panels.length, 3);
  assert.deepEqual(host.state.panels, guest.state.panels);
  assert.deepEqual(guest.state.panels, third.state.panels);
  assert.equal((await call(guest, "game:reset")).ok, false);
  assert.equal((await call(host, "game:reset")).ok, true);
  await waitFor(() => guest.state.status === "lobby");
  assert.deepEqual(guest.state.panels, []);
  assert.equal((await call(host, "game:start")).ok, true);
  assert.equal(
    (await call(host, "story:submit", { text: "Another story" })).ok,
    true,
  );
});

test("refresh restores identity; host transfers after grace and can skip offline writer", async (t) => {
  const { host, created, client } = await fixture(t);
  const guest = await client();
  const joined = await call(guest, "room:join", {
    code: created.code,
    nickname: "Guest",
  });
  await call(host, "game:start");
  const id = guest.state.you;
  guest.disconnect();
  const refreshed = await client();
  assert.equal((await call(refreshed, "player:reconnect", joined)).ok, true);
  await waitFor(() => refreshed.state?.you === id);
  assert.equal(refreshed.state.players.length, 2);
  host.disconnect();
  await waitFor(() => refreshed.state.hostId === id);
  assert.equal(
    (
      await call(refreshed, "player:skip", {
        playerId: refreshed.state.currentPlayerId,
      })
    ).ok,
    true,
  );
  assert.equal(
    (
      await call(refreshed, "story:submit", {
        text: "The understudy saves the story.",
      })
    ).ok,
    true,
  );
  await waitFor(() => refreshed.state.status === "reveal");
  assert.equal(refreshed.state.panels.length, 1);
  const hostAgain = await client();
  assert.equal((await call(hostAgain, "player:reconnect", created)).ok, true);
  await waitFor(() => hostAgain.state?.status === "reveal");
  assert.equal(hostAgain.state.hostId, id);
});

test("capacity, duplicate nickname, invalid tokens and grace period are enforced", async (t) => {
  const { host, created, client } = await fixture(t, { graceMs: 1000 });
  const a = await client(),
    b = await client(),
    c = await client();
  assert.equal(
    (await call(a, "room:join", { code: "BAD", nickname: "A" })).ok,
    false,
  );
  assert.equal(
    (await call(a, "room:join", { code: created.code, nickname: "host" })).ok,
    false,
  );
  await call(a, "room:join", { code: created.code, nickname: "A" });
  await call(b, "room:join", { code: created.code, nickname: "B" });
  assert.equal(
    (await call(c, "room:join", { code: created.code, nickname: "C" })).ok,
    false,
  );
  assert.equal(
    (await call(c, "player:reconnect", { code: created.code, token: "wrong" }))
      .ok,
    false,
  );
  await call(host, "game:start");
  await call(host, "story:submit", { text: "Start" });
  a.disconnect();
  await waitFor(() => !host.state.players[1].connected);
  assert.equal(
    (await call(host, "player:skip", { playerId: host.state.players[1].id }))
      .ok,
    false,
  );
  assert.equal(
    (await call(c, "room:join", { code: created.code, nickname: "C" })).ok,
    false,
  );
});

test("leaving active turn advances; leaving host transfers ownership", async (t) => {
  const { host, created, client } = await fixture(t);
  const a = await client();
  await call(a, "room:join", { code: created.code, nickname: "A" });
  await call(host, "game:start");
  await call(host, "room:leave");
  await waitFor(
    () =>
      a.state.hostId === a.state.you && a.state.currentPlayerId === a.state.you,
  );
  await call(a, "story:submit", { text: "The remaining story." });
  await waitFor(() => a.state.status === "reveal");
  await call(a, "game:reset");
  await waitFor(() => a.state.status === "lobby");
  assert.equal(a.state.players.length, 1);
});

test("inactive rooms expire and socket sessions are released", async (t) => {
  const { app, host, created, client } = await fixture(t, { roomTtlMs: 100 });
  let expired = false;
  host.on("room:expired", () => {
    expired = true;
  });
  await waitFor(() => expired);
  assert.equal(app.game.rooms.size, 0);
  const a = await client();
  assert.equal((await call(a, "player:reconnect", created)).ok, false);
  assert.equal(
    (
      await call(host, "room:create", {
        name: "New",
        nickname: "Host",
        genre: "Random",
        maxPlayers: 2,
      })
    ).ok,
    true,
  );
});

test("message flooding is rate limited without changing room state", async (t) => {
  const { host } = await fixture(t);
  let limited = false;
  for (let i = 0; i < 40; i++) {
    const result = await call(host, "story:submit", { text: "Spam" });
    if (result.error?.includes("Slow down")) limited = true;
  }
  assert.equal(limited, true);
  assert.equal(host.state.status, "lobby");
  assert.equal(host.state.completed, 0);
});
