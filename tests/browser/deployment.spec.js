import { test, expect } from "@playwright/test";
import express from "express";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { io } from "socket.io-client";
import { createApp } from "../../server/index.js";
const exec = promisify(execFile);

const listen = (server) =>
  new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = (server) => `http://127.0.0.1:${server.address().port}`;

test("separate frontend and backend origins support an entire multiplayer game", async ({
  context,
}) => {
  test.setTimeout(60_000);
  const output = await mkdtemp(path.join(tmpdir(), "plotrelay-split-"));
  const frontendApp = express();
  frontendApp.use(express.static(output));
  const frontend = createServer(frontendApp);
  await listen(frontend);
  const frontendUrl = origin(frontend);
  const backend = createApp({ appOrigin: `${frontendUrl}/` });
  await listen(backend.server);
  const backendUrl = origin(backend.server);
  try {
    await exec(
      process.execPath,
      ["node_modules/vite/bin/vite.js", "build", "--outDir", output],
      { env: { ...process.env, VITE_SERVER_URL: backendUrl, VERCEL: "0" } },
    );
    const host = await context.newPage(),
      guest = await context.newPage();
    const socketDestinations = [];
    host.on("request", (request) => {
      if (request.url().includes("/socket.io/"))
        socketDestinations.push(new URL(request.url()).origin);
    });
    await host.goto(frontendUrl);
    await host
      .getByRole("button", { name: "Create a room", exact: true })
      .click();
    await host.getByLabel("Your nickname").fill("Vercel Host");
    await host.getByRole("button", { name: "Create my room" }).click();
    await expect(host.locator(".room-code strong")).toBeVisible();
    const code = (await host.locator(".room-code strong").innerText()).trim();
    await guest.goto(`${frontendUrl}/?room=${code}`);
    await guest.getByLabel("Your nickname").fill("Remote Guest");
    await guest.getByRole("button", { name: "Let me in" }).click();
    await expect(host.locator(".player-card")).toHaveCount(2);
    await host.getByRole("button", { name: "Start the story" }).click();
    await host
      .getByLabel("Your story contribution")
      .fill("A story from the frontend host.");
    await host.getByRole("button", { name: "Pass the plot" }).click();
    await guest
      .getByLabel("Your story contribution")
      .fill("A live reply through the separate backend.");
    await guest.reload();
    await expect(guest.getByLabel("Your story contribution")).toHaveValue(
      "A live reply through the separate backend.",
    );
    await guest.getByRole("button", { name: "Pass the plot" }).click();
    await expect(host.locator(".comic-panel")).toHaveCount(2);
    await expect(guest.locator(".comic-panel")).toHaveCount(2);
    expect(await host.locator(".speech").allTextContents()).toEqual(
      await guest.locator(".speech").allTextContents(),
    );
    expect(socketDestinations.length).toBeGreaterThan(0);
    expect(socketDestinations.every((value) => value === backendUrl)).toBe(
      true,
    );
    const health = await host.evaluate(
      async (url) => (await fetch(`${url}/api/health`)).json(),
      backendUrl,
    );
    expect(health).toEqual({ ok: true, service: "PlotRelay" });
    for (const transport of ["polling", "websocket"]) {
      const denied = io(backendUrl, {
        transports: [transport],
        extraHeaders: { Origin: "https://unapproved.example" },
        reconnection: false,
      });
      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Missing origin rejection")),
            5000,
          );
          denied.on("connect_error", () => {
            clearTimeout(timer);
            resolve();
          });
          denied.on("connect", () => {
            clearTimeout(timer);
            reject(new Error("Unapproved origin connected"));
          });
        });
      } finally {
        denied.disconnect();
      }
    }
  } finally {
    await context.close();
    await backend.close();
    await new Promise((resolve) => frontend.close(resolve));
    await rm(output, { recursive: true, force: true });
  }
});

test("Vercel refuses a build with no configured multiplayer backend", async () => {
  try {
    await exec(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
      env: { ...process.env, VERCEL: "1", VITE_SERVER_URL: "" },
    });
    throw new Error("Expected a missing-backend build failure");
  } catch (error) {
    expect(error.code).toBe(1);
    expect(error.stderr).toContain("Set VITE_SERVER_URL in Vercel");
  }
});
