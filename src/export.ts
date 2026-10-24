import type { Room } from "./types";
export async function storyImage(room: Room): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser.");
  ctx.font = "28px sans-serif";
  const layouts = room.panels.map((panel) => {
    const lines: string[] = [];
    let line = "";
    for (const ch of panel.text) {
      if (ch === "\n" || ctx.measureText(line + ch).width > 925) {
        lines.push(line);
        line = ch === "\n" ? "" : ch;
      } else line += ch;
    }
    if (line) lines.push(line);
    return { lines, height: Math.max(300, 110 + lines.length * 32) };
  });
  canvas.height =
    245 + layouts.reduce((sum, panel) => sum + panel.height + 25, 0);
  ctx.fillStyle = "#17152e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffe36e";
  ctx.font = "bold 48px sans-serif";
  ctx.fillText("PlotRelay", 60, 82);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(room.name, 60, 135);
  ctx.fillStyle = "#bcb5d4";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    `One story. ${room.panels.length} minds. Total chaos. • ${room.genre}`,
    60,
    177,
  );
  const colors = ["#e9e0ff", "#ffe4ac", "#c9f4e8", "#ffd7e0"];
  let y = 215;
  room.panels.forEach((p, i) => {
    const { lines, height } = layouts[i];
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(40, y, 1000, height, 24);
    ctx.fill();
    ctx.fillStyle = "#17152e";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`PANEL ${i + 1}  /  ${p.author}`, 75, y + 48);
    ctx.font = "28px sans-serif";
    lines.forEach((text, j) => ctx.fillText(text, 75, y + 95 + j * 32));
    y += height + 25;
  });
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not export the story.")),
      "image/png",
    ),
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
