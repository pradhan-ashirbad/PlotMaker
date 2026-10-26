# Connect the Vercel website to the multiplayer server

The existing site is `https://plot-maker.vercel.app`. Vercel builds the React app into static files, but the app also requires a long-running Node/Socket.IO server. The server owns rooms, player identities, and turns in memory. A static Vercel deployment alone cannot run this server, and moving it into a Vercel Function does not provide a persistent shared room process.

Keep the website on Vercel and deploy the Node server on Render (or another persistent Node host). No database, API keys, or app accounts are needed. Hosting account access is needed to create the service and set Vercel's environment variable.

## 1. Deploy the backend

Open [Deploy to Render](https://render.com/deploy?repo=https://github.com/pradhan-ashirbad/PlotMaker) and connect your GitHub repository. The checked-in `render.yaml` provides a Blueprint with:

- Runtime: Node 24
- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Environment: `APP_ORIGIN=https://plot-maker.vercel.app`
- One free web service; no database

Wait for the service to be Live, then copy its actual HTTPS URL from Render. The service name is not a guarantee of the hostname; use the URL Render shows. Visiting `ACTUAL_BACKEND_URL/api/health` should return `{"ok":true,"service":"PlotRelay"}`. No secret or password is needed for this health endpoint.

The free Render service may sleep when idle and take time to wake up. Restarts, deploys, and sleeping discard rooms because this prototype has no database. Choose an always-on plan only if you want to pay for avoiding idle suspension. Run a single instance; separate memory stores do not share rooms.

## 2. Connect Vercel

In the **PlotMaker project → Settings → Environment Variables**, add:

| Name              | Value                                              |
| ----------------- | -------------------------------------------------- |
| `VITE_SERVER_URL` | The actual HTTPS backend origin copied from Render |

Select **Production**. The value must be just the origin, such as `https://your-actual-service.onrender.com`, without `/api`, `/socket.io`, a query, or credentials. It is a public frontend setting, not a secret.

**Redeploy the Vercel project after saving the variable.** Vite embeds it during the build; adding it does not change an already deployed bundle. The repository now rejects Vercel builds with a missing or invalid backend URL instead of deploying a homepage with unusable room controls. The frontend sends Socket.IO requests directly to the backend; no Vercel rewrite or Function is required.

If using Vercel Preview deployments, their origins must also be added explicitly to the backend's comma-separated `APP_ORIGIN`, and `VITE_SERVER_URL` must be set for Preview builds. Production works with the exact origin already in `render.yaml`. Add any custom frontend domain to the allowed origins as well. Do not permit every Vercel subdomain.

## 3. Verify the deployed game

1. Open `https://plot-maker.vercel.app` and wait for the connection banner to disappear.
2. Create a room, then open its invitation link in a second tab/device.
3. Join with a different nickname and verify both player cards appear.
4. Start the story, submit one panel from each player, and check that both see the same reveal.
5. Refresh a player mid-turn to verify reconnection and draft preservation.

If it still connects endlessly, check the browser's Network tab: `/socket.io/` requests must target the **backend hostname**, not `plot-maker.vercel.app`. A missing backend, wrong URL, blocked origin, or a sleeping backend can prevent the connection. Check the Render logs and the health endpoint. A successful frontend build alone does not prove that multiplayer is deployed.

## Local verification of this topology

`npm run test:browser -- --grep 'separate frontend'` builds the real frontend with a backend URL, serves it on another origin, and plays a complete two-player game against the separate server. It also checks that an unapproved browser origin cannot connect. This exercises the split-host configuration, but it does not deploy to Render or verify a user's hosting settings.
