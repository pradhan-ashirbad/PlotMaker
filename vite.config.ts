import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const serverUrl = env.VITE_SERVER_URL?.trim();
  if (env.VERCEL === "1" && !serverUrl) {
    throw new Error(
      "PlotRelay needs a persistent Socket.IO backend. Set VITE_SERVER_URL in Vercel to your deployed Node backend's HTTPS origin, then redeploy. See docs/VERCEL.md.",
    );
  }
  if (serverUrl) {
    let url: URL;
    try {
      url = new URL(serverUrl);
    } catch {
      throw new Error(
        "VITE_SERVER_URL must be an absolute HTTP(S) backend origin.",
      );
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "VITE_SERVER_URL must contain only the backend origin, without a path, query, or credentials.",
      );
    }
    if (env.VERCEL === "1" && url.protocol !== "https:") {
      throw new Error("VITE_SERVER_URL must use HTTPS for the Vercel website.");
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/socket.io": { target: "http://127.0.0.1:3001", ws: true },
        "/api": "http://127.0.0.1:3001",
      },
    },
  };
});
