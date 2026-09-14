---
name: Root artifact routing
description: Root web artifacts share a workspace with the API service mounted at /api.
---

Root web artifacts cannot reliably own `/api/*` routes when the shared API artifact is mounted at `/api`; the proxy sends those requests to the shared service first.

**Why:** A Node app serving its own frontend and API returned 404s from the shared API server even though its local routes were correct.

**How to apply:** Use a product-specific prefix such as `/booster-api/*` for routes handled by a root web artifact, or move the routes into the shared API artifact.