# Xenon Booster

Node.js and Express social growth control panel using the provider API at `https://nikoxsmm.site/api/v2`.

## Setup

Create a `.env` file from `.env.example`, then add the provider key through the project secrets manager:

```bash
pnpm install
pnpm start
```

The browser talks only to the local `/booster-api/*` routes. The provider key is never sent to the client.