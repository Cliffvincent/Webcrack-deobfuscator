# Xenon Booster

Xenon Booster is a Node.js and Express control panel for browsing social growth services, placing orders, tracking status, and managing refills through a protected provider proxy.

## Run & Operate

- `pnpm --filter @workspace/xenon-booster run dev` — run the Xenon Booster Node.js app
- `pnpm --filter @workspace/api-server run dev` — run the shared API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `API_KEY` — provider API key, stored as a Replit Secret
- Optional env: `API_URL` — provider API endpoint (defaults to the Xenon endpoint in the app)

## Stack

- pnpm workspaces, Node.js 24
- App: Express 5, Axios, dotenv
- Frontend: static HTML, CSS, and browser JavaScript served by Express

## Where things live

- `artifacts/xenon-booster/server.js` — Express server and provider proxy routes
- `artifacts/xenon-booster/public/` — static panel UI
- `artifacts/xenon-booster/.env.example` — non-secret environment template
- The provider key stays server-side; browser calls use `/booster-api/*`

## Architecture decisions

- The app is intentionally plain Node.js/Express; the generated React/Vite starter was removed.
- Provider requests are proxied server-side so the API key is never sent to the browser.
- The `/booster-api/*` prefix avoids the shared workspace API service mounted at `/api`.

## Product

- View live services and account balance when the provider key is configured.
- Place new orders with service-aware quantity limits and estimated charges.
- Check one or multiple order statuses.
- Create single or bulk refills and inspect refill status responses.

## User preferences

- The user requested a Node.js app rather than the Python generator or React/Vite starter template.

## Gotchas

- Without `API_KEY`, provider endpoints intentionally return a clear 503 configuration error.
- Use the artifact workflow for the app; its production runner starts `server.js` directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
