import { test, expect } from "@playwright/test";
import { createApp } from "../../server/index.js";

async function serve(port = 0) {
  const app = createApp();
  await new Promise((resolve) => app.server.listen(port, "127.0.0.1", resolve));
  return app;
}
async function createRoom(page, origin, nickname = "Recovery Host") {
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Create a room", exact: true })
    .click();
  await page.getByLabel("Your nickname").fill(nickname);
  await page.getByRole("button", { name: "Create my room" }).click();
  await expect(page.locator(".room-code strong")).toBeVisible();
  return (await page.locator(".room-code strong").innerText()).trim();
}

test("lost acknowledgements are retried without duplicating rooms or submissions", async ({
  context,
}) => {
  const app = await serve();
  const dropped = new Set();
  app.io.on("connection", (socket) =>
    socket.use((packet, next) => {
      if (
        ["room:create", "story:submit"].includes(packet[0]) &&
        !dropped.has(packet[0])
      ) {
        dropped.add(packet[0]);
        packet[packet.length - 1] = () => {};
      }
      next();
    }),
  );
  try {
    const origin = `http://127.0.0.1:${app.server.address().port}`;
    const host = await context.newPage(),
      guest = await context.newPage();
    const code = await createRoom(host, origin);
    await guest.goto(`${origin}/?room=${code}`);
    await guest.getByLabel("Your nickname").fill("Guest");
    await guest.getByRole("button", { name: "Let me in" }).click();
    await expect(
      host.getByRole("button", { name: "Start the story" }),
    ).toBeEnabled({ timeout: 12_000 });
    expect(app.game.rooms.size).toBe(1);
    await host.getByRole("button", { name: "Start the story" }).click();
    await host
      .getByLabel("Your story contribution")
      .fill("Exactly one opening.");
    await host.getByRole("button", { name: "Pass the plot" }).click();
    await expect(guest.getByLabel("Your story contribution")).toBeVisible();
    // The host's action is released only after the repeated request is acknowledged.
    await expect(host.getByRole("button", { name: "Leave room" })).toBeEnabled({
      timeout: 12_000,
    });
    expect(app.game.rooms.get(code).panels).toHaveLength(1);
    await guest
      .getByLabel("Your story contribution")
      .fill("Exactly one ending.");
    await guest.getByRole("button", { name: "Pass the plot" }).click();
    await expect(host.locator(".comic-panel")).toHaveCount(2);
    await expect(guest.locator(".comic-panel")).toHaveCount(2);
  } finally {
    await app.close();
  }
});

test("timed out reconnect keeps the token and recovers instead of abandoning the room", async ({
  page,
}) => {
  const app = await serve();
  let dropped = 0;
  app.io.on("connection", (socket) =>
    socket.use((packet, next) => {
      if (packet[0] === "player:reconnect" && dropped < 2) {
        dropped++;
        packet[packet.length - 1] = () => {};
      }
      next();
    }),
  );
  try {
    const code = await createRoom(
      page,
      `http://127.0.0.1:${app.server.address().port}`,
    );
    await page.reload();
    await expect(page.getByRole("button", { name: "Leave room" })).toBeEnabled({
      timeout: 20_000,
    });
    expect(dropped).toBe(2);
    expect(app.game.rooms.get(code).players).toHaveLength(1);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Leave room" }),
    ).toBeEnabled();
    await expect(page.locator(".room-code strong")).toContainText(code);
  } finally {
    await app.close();
  }
});

test("a restarted server reports a lost room and permits creating a new one", async ({
  page,
}) => {
  let app = await serve();
  const port = app.server.address().port;
  try {
    await createRoom(page, `http://127.0.0.1:${port}`);
    await app.close();
    app = await serve(port);
    await expect(
      page.getByText(
        "Your previous room has expired or your seat was removed. Create or join a new room.",
      ),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "PlotRelay home" }).click();
    await page
      .getByRole("button", { name: "Create a room", exact: true })
      .click();
    await page.getByLabel("Your nickname").fill("Back Again");
    await page.getByRole("button", { name: "Create my room" }).click();
    await expect(page.locator(".room-code strong")).toBeVisible();
    expect(app.game.rooms.size).toBe(1);
  } finally {
    await app.close();
  }
});

test("an invitation to another room overrides an unrelated saved session", async ({
  context,
}) => {
  const app = await serve();
  try {
    const origin = `http://127.0.0.1:${app.server.address().port}`;
    const a = await context.newPage(),
      b = await context.newPage();
    await createRoom(a, origin, "First Host");
    const code = await createRoom(b, origin, "Second Host");
    await a.goto(`${origin}/?room=${code}`);
    await expect(a.getByRole("button", { name: "Let me in" })).toBeEnabled();
    await a.getByLabel("Your nickname").fill("Invited Guest");
    await a.getByRole("button", { name: "Let me in" }).click();
    await expect(b.locator(".player-card")).toHaveCount(2);
    await expect(a.locator(".room-code strong")).toContainText(code);
  } finally {
    await app.close();
  }
});

test("clipboard denial shows a selectable invitation link", async ({
  page,
}) => {
  const app = await serve();
  try {
    const origin = `http://127.0.0.1:${app.server.address().port}`;
    const code = await createRoom(page, origin);
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error("denied")) },
      }),
    );
    await page.getByRole("button", { name: "Copy invitation link" }).click();
    await expect(
      page.getByLabel("Invitation link", { exact: true }),
    ).toHaveValue(`${origin}/?room=${code}`);
  } finally {
    await app.close();
  }
});

test("duplicating a tab does not erase the active player token or trap the old tab", async ({
  page,
}) => {
  const app = await serve();
  try {
    const origin = `http://127.0.0.1:${app.server.address().port}`;
    const code = await createRoom(page, origin);
    const popupEvent = page.waitForEvent("popup");
    await page.evaluate(() => window.open(location.href, "_blank"));
    const popup = await popupEvent;
    await expect(popup.locator(".room-code strong")).toContainText(code);
    await expect(
      page.getByRole("button", { name: "Retry connection" }),
    ).toBeVisible();
    await popup.reload();
    await expect(popup.locator(".room-code strong")).toContainText(code);
    await page.getByRole("button", { name: "Retry connection" }).click();
    await page
      .getByRole("button", { name: "Create a room", exact: true })
      .click();
    await page.getByLabel("Your nickname").fill("Independent Player");
    await page.getByRole("button", { name: "Create my room" }).click();
    await expect(page.locator(".room-code strong")).toBeVisible();
    expect(app.game.rooms.size).toBe(2);
    await expect(popup.locator(".room-code strong")).toContainText(code);
  } finally {
    await app.close();
  }
});
