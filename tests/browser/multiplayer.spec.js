import { test, expect } from "@playwright/test";

test("two independent browser sessions play, refresh, reveal, export and restart", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const errors = [];
  host.on("pageerror", (e) => errors.push(e.message));
  guest.on("pageerror", (e) => errors.push(e.message));
  await host.goto("/");
  await expect(host.getByText("A little chaos. A lot of fun.")).toBeVisible();
  await host.screenshot({
    path: "/tmp/plotrelay-home-desktop.png",
    fullPage: true,
  });
  await host
    .getByRole("button", { name: "Create a room", exact: true })
    .click();
  await host.getByLabel("Your nickname").fill("Alex");
  await host.getByRole("button", { name: "Create my room" }).click();
  await expect(host.getByText("Your cast is coming together.")).toBeVisible();
  const code = (await host.locator(".room-code strong").innerText()).trim();
  await guest.goto(`/?room=${code}`);
  await guest.getByLabel("Your nickname").fill("Sam");
  await guest.getByRole("button", { name: "Let me in" }).click();
  await expect(host.locator(".player-card")).toHaveCount(2);
  await expect(guest.locator(".player-card")).toHaveCount(2);
  await host.getByRole("button", { name: "Start the story" }).click();
  await host
    .getByLabel("Your story contribution")
    .fill("The cat declared itself mayor of the moon.");
  await expect(guest.getByText("Alex is writing")).toBeVisible();
  await expect(
    guest.getByText("The cat declared itself mayor of the moon."),
  ).toHaveCount(0);
  await host.getByRole("button", { name: "Pass the plot" }).click();
  await expect(
    guest.getByText("“The cat declared itself mayor of the moon.”"),
  ).toBeVisible();
  await guest.reload();
  await expect(guest.getByLabel("Your story contribution")).toBeVisible();
  await guest.getByRole("button", { name: "Give me a twist" }).click();
  await expect(guest.locator(".twist")).toBeVisible();
  await guest
    .getByLabel("Your story contribution")
    .fill("Its first decree: all astronauts must bring tuna.");
  await guest.screenshot({
    path: "/tmp/plotrelay-writing-mobile.png",
    fullPage: true,
  });
  await guest.getByRole("button", { name: "Pass the plot" }).click();
  await expect(host.locator(".comic-panel")).toHaveCount(2);
  await expect(guest.locator(".comic-panel")).toHaveCount(2);
  expect(await host.locator(".speech").allTextContents()).toEqual(
    await guest.locator(".speech").allTextContents(),
  );
  await host.screenshot({ path: "/tmp/plotrelay-reveal.png", fullPage: true });
  const downloadEvent = host.waitForEvent("download");
  await host.getByRole("button", { name: "Download comic" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("plotrelay-story.png");
  await download.saveAs("/tmp/plotrelay-export.png");
  await host.getByRole("button", { name: "Replay reveal" }).click();
  await expect(host.locator(".comic-panel")).toHaveCount(2);
  await host.getByRole("button", { name: "Back to lobby" }).click();
  await expect(guest.getByText("Your cast is coming together.")).toBeVisible();
  await host.getByRole("button", { name: "Start the story" }).click();
  await expect(host.getByLabel("Your story contribution")).toBeVisible();
  expect(errors).toEqual([]);
  await hostContext.close();
  await guestContext.close();
});

test("landing and forms fit a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.screenshot({
    path: "/tmp/plotrelay-home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Create a room", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Create my room" }),
  ).toBeVisible();
});
