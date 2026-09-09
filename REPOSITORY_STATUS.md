# REPOSITORY_STATUS.md

## Summary

- **Status**: Built (Functional Full-Stack Prototype)
- **Working**: Yes (Application builds, dev server runs, API and UI views operate without runtime crashes)
- **Portfolio value**: MEDIUM
- **Production readiness**: LOW

---

## Findings

| Area | Status | Evidence |
| :--- | :--- | :--- |
| **Visibility** | UNKNOWN | `package.json` contains `"private": true`. The local directory is not a Git repository (no `.git` directory exists), so remote host visibility (GitHub/GitLab public vs. private) cannot be verified. |
| **Implementation** | Built | Complete frontend (React 18, Tailwind CSS, Radix UI, TanStack Query, DndKit, Recharts) and backend (Express ingress proxy + Hono router on Node.js) are implemented. Core business entities and client views are fully rendered. |
| **Functionality** | Working | `npm run build` (`vite build` + `esbuild`) and `npm run lint` (`tsc --noEmit`) complete with 0 errors. Verified HTTP endpoints (`/api/health`, `/api/v1/devices`, `/api/v1/playlists`, `/api/v1/metrics`) return HTTP 200 with JSON payloads. |
| **README** | Partially Accurate | Accurate regarding UI views, tech stack, API route list, and build commands. Inaccurate/aspirational regarding cryptographic enforcement and real-world edge hardware integrations (Ed25519 signing and P2P mesh transfers are simulated in-memory rather than mathematically computed over network sockets). |
| **Architecture** | Partially Accurate | Accurately describes the Express gateway proxy, Hono router, and in-memory Durable Object actor model. Aspirational regarding production storage (uses an in-memory `GlobalDurableObject` Map rather than Cloudflare Durable Objects or an external SQL database) and true cryptographic verification. |
| **Tags** | UNKNOWN | No Git metadata exists in the repository (`.git` directory is missing). `package.json` lists `"version": "1.6.0"`, but Git release tags or semantic version releases cannot be verified. |
| **Tests / CI** | Not Implemented | Zero automated test files exist (0 unit, integration, or E2E tests). `package.json` lacks a `"test"` script. No CI/CD configuration files (such as `.github/workflows/` or `.gitlab-ci.yml`) exist. Only static type checking (`tsc --noEmit`) is configured. |
| **Security** | Critical Concerns | 1. API routes do not validate `Authorization: Bearer` tokens on incoming requests. 2. Pairing challenge verification only compares the 6-digit code; incoming cryptographic signatures are ignored. 3. SSO endpoint is a mock logger without token validation. 4. In-memory data store lacks encryption at rest. |
| **Demo** | Working | Running live in cloud container preview on port 3000 (`https://ais-dev-z5f4a7vdjtf6rgbngeyfvn-56044438869.europe-west2.run.app`). Health endpoint confirms active uptime. |
| **Installable / Published** | Installable (Not Published) | Installs locally via `npm install` and runs via `npm run dev` or `npm run build && npm start`. Marked `"private": true` in `package.json`; not published to npm. No Dockerfile or container image manifest in repository root. |
| **Portfolio** | MEDIUM | Demonstrates strong frontend UI design, component hierarchy, drag-and-drop manipulation, Recharts data visualization, and full-stack API integration. Deducted for absence of automated tests, mock cryptography, and in-memory transient persistence. |

---

## Risks

1. **Complete Data Loss on Restart**: Persistence relies entirely on an in-memory JavaScript `Map` inside `worker/core-utils.ts`. Any container restart, crash, or deployment immediately resets all state back to initial mock fixtures.
2. **Missing Backend Authentication Enforcement**: While the frontend sets `Authorization: Bearer <token>` in `api-client.ts`, backend route handlers in `worker/user-routes.ts` perform no token or session validation. Any unauthenticated caller can create, publish, or delete playlists and devices.
3. **Simulated Cryptography**: Security claims regarding Ed25519 signatures and manifest signing rely on `crypto.randomUUID()` strings rather than cryptographic signature generation and public-key verification.
4. **Lack of Automated Test Coverage**: With zero unit or integration tests, regressions in routing, serialization, or state mutations cannot be caught prior to manual inspection.

---

## Recommended fixes

1. **Implement Automated Test Suite**: Add Vitest/Jest and React Testing Library to test critical routes (`/api/v1/playlists`, `/api/v1/devices`), the anomaly detection engine (`src/lib/anomaly-engine.ts`), and entity mutations. Add a `"test"` script to `package.json`.
2. **Back Entity Storage with Durable Persistence**: Replace the in-memory `GlobalDurableObject` Map with a durable backing store (e.g., SQLite, PostgreSQL via Drizzle, or Cloudflare KV/Durable Objects) so changes persist across restarts.
3. **Enforce Backend Authentication & Signature Checks**: Implement middleware in `worker/user-routes.ts` verifying bearer tokens against stored device access tokens, and replace random UUID strings with genuine Web Crypto API (SubtleCrypto) Ed25519/ECDSA verification.
4. **Initialize Git Repository & CI Pipeline**: Initialize Git tracking (`git init`), create standard commit history, and configure a GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm run lint`, `npm test`, and `npm run build`.

---

## Final verdict

This repository demonstrates impressive UI execution, clean TypeScript architecture, and a compelling simulation of distributed signage orchestration, but it should currently only be shown to a recruiter as an interactive frontend/full-stack prototype rather than a production-ready distributed system. The absence of automated tests, unauthenticated backend endpoints, and in-memory persistence limit its readiness; adding a solid test suite and genuine cryptographic verification would immediately elevate it to a top-tier portfolio centerpiece.
