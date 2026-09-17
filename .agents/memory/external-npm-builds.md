---
name: External npm builds
description: Portability guidance for npm lockfiles created inside Replit and used by external builders.
---

When deploying a Replit Node.js project to an external Docker builder, inspect package-lock.json resolved URLs. Replit's package firewall may write internal registry URLs that are unreachable outside Replit; the Docker build must rewrite them to the public npm registry or use a lockfile generated against that registry.

**Why:** Railway failed during `npm ci` because the lockfile pointed at Replit-only package URLs, even though dependency installation worked inside Replit.

**How to apply:** Before external deployment, validate a clean `npm ci` in a temporary directory after converting internal resolved URLs to `https://registry.npmjs.org/`, and keep direct dependency versions exact when reproducibility matters.