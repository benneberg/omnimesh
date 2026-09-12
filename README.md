# OmniScreenMesh

> **Enterprise Digital Signage Control Plane & Multi-Screen Mesh Synchronization Platform**

[![CI / Production Pipeline](https://img.shields.io/badge/CI%20Pipeline-passing-2ea44f?style=flat&logo=githubactions&logoColor=white)](https://github.com/benneberg/omnimesh/actions/workflows/ci.yml)
[![Demo on GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-22c55e?style=flat&logo=github&logoColor=white)](https://benneberg.github.io/omnimesh/)
[![Tests](https://img.shields.io/badge/Vitest-31%20passed-2e7d32?style=flat&logo=vitest&logoColor=white)](./tests)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38b2ac?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cryptography](https://img.shields.io/badge/Security-Ed25519%20%2B%20SHA--256-4f46e5?style=flat&logo=openaccess&logoColor=white)](./shared/crypto-utils.ts)
[![License](https://img.shields.io/badge/License-MIT-gray?style=flat)](./LICENSE)

OmniScreenMesh is a unified digital signage orchestration platform designed for high-availability multi-display networks across heterogeneous operating systems (LG webOS, Samsung Tizen, ChromeOS, signageOS, and modern web browsers). It pairs a visual manifest control plane with an edge terminal simulator, verifiable Proof-of-Play (PoP) auditing, and predictive hardware telemetry.

---

## Key Capabilities

- **Executive Fleet Dashboard**: Real-time overview of active terminals, global network mesh efficiency, P2P cache hit ratios, and rolling Proof-of-Play verifications.
- **Predictive Maintenance & Anomaly Detection**: Ingestion of rolling telemetry windows to detect memory leaks, CPU saturation, and thermal degradation before screens crash.
- **Visual Manifest Editor & Layer Sequencer**: Drag-and-drop playlist creation with support for video, image, web URL, and custom HTML layers, enforcing SHA-256 content integrity checks prior to distribution.
- **Cryptographic Trust & Proof-of-Play (PoP)**: Ed25519-signed manifests and non-repudiable playback logs recorded by edge nodes upon asset completion.
- **Simulated Hardware Edge Terminal**: Built-in interactive screen player simulator supporting portrait/landscape orientations, resolution scaling (1080p, 4K), simulated network drops, offline playback from cache, and watchdog crash recovery.
- **Zero-Touch Provisioning & Pairing**: Challenge-response handshake protocol generating short-lived 6-digit pairing codes and hardware challenge nonces.
- **Enterprise Security & SSO**: Configurable Single Sign-On (SAML 2.0 / OIDC) enforcement, sliding-window rate limiting, and immutable audit logs.
- **Mobile-First Responsive Design**: Adaptive layout engine optimized for portrait mobile screens up to ultra-wide operations monitors with zero horizontal overflow, adaptive cards, and collapsible touch drawers.
- **Integrated API Documentation**: Live, interactive OpenAPI-style documentation with copyable cURL commands and response schemas.

---

## Architecture & Technology Stack

OmniScreenMesh is built as a full-stack TypeScript application combining modern React UI primitives with a resilient micro-framework backend:

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Radix UI primitives, Lucide Icons, Sonner toasts |
| **State & Data Fetching** | TanStack React Query v5, Immer, React Router v6 |
| **Drag & Drop / Visualization** | `@dnd-kit/core`, `@dnd-kit/sortable`, Recharts time-series telemetry charts |
| **Backend & Ingress Gateway** | Node.js, Express 4 gateway (Port 3000), Vite development middleware |
| **API Router & Entities** | Hono micro-framework, Durable Object state engine model with atomic CAS updates |
| **Persistence Engine** | Atomic file-backed partition storage (`worker/durable-storage.ts`) with disk debouncing |
| **Cryptography** | Isomorphic Web Crypto API (SubtleCrypto) Ed25519 signatures & SHA-256 integrity |
| **Testing & CI** | Vitest (31 unit/integration tests), GitHub Actions automated matrix CI workflow |
| **Bundler & Build Tooling** | Vite 6, esbuild, TypeScript |

> For a deep dive into entity data structures, cryptographic handshakes, and recovery state machines, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Quickstart & Local Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm v9.0.0 or higher

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000` (binding to `0.0.0.0:3000`).

3. **Verify the server**:
   Open a terminal and test the health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Expected response:
   ```json
   {"success": true, "data": {"status": "healthy", "timestamp": "..."}}
   ```

### Production Build & Deployment

To compile both the client-side SPA and the backend server bundle:

```bash
npm run build
```

This runs:
1. `vite build` to generate static frontend assets into `dist/`.
2. `esbuild server.ts` to bundle the backend gateway into `dist/server.cjs`.

To start the production server:
```bash
npm start
```

### Testing & Verification

OmniScreenMesh includes an automated test suite powered by **Vitest**:

```bash
# Run full automated test suite (25 tests across 4 suites)
npm test

# Run tests in watch mode
npm run test:watch

# Static type check
npm run lint
```

A continuous integration pipeline (`.github/workflows/ci.yml`) automatically executes static type analysis, the automated test suite, and bundle verification on every push and pull request across Node.js 20.x and 22.x runtimes.

---

## Primary Application Views

| Route | View Name | Description |
| :--- | :--- | :--- |
| `/` | **Overview** | Executive fleet metrics, active anomalies, quick node status, and telemetry gauges. |
| `/fleet` | **Fleet Management** | Full device inventory, platform filtering, search, and real-time telemetry inspection drawer. |
| `/playlists` | **Manifest Editor** | Drag-and-drop layer sequencing, SHA-256 integrity verification, and cryptographic signing. |
| `/simulator/:id` | **Screen Simulator** | Realistic edge signage player simulating heartbeats, P2P mesh caching, and PoP recording. |
| `/provision` | **Enrollment** | Cryptographic keypair generation, QR code onboarding, and pairing challenge verification. |
| `/settings` | **Organization Settings** | SSO identity provider configuration, cluster mesh settings, and audit log exports. |
| `/docs` | **API Reference** | Interactive documentation for all fleet, playlist, and metrics endpoints. |

---

## Core API Endpoints

All endpoints are served under the `/api/v1` namespace:

### Device & Fleet Management
- `GET /api/v1/devices` — List all registered devices with pagination support.
- `GET /api/v1/devices/:id` — Retrieve comprehensive status and vitals for a specific node.
- `POST /api/v1/devices/init` — Register a new edge node and receive a 6-digit pairing challenge.
- `POST /api/v1/devices/:id/pair` — Complete the cryptographic handshake with an authorization signature.
- `POST /api/v1/devices/:id/heartbeat` — Ingest device vitals (CPU, memory, storage, playback errors).
- `POST /api/v1/devices/:id/token/refresh` — Rotate an active device access token.

### Playlist & Manifest Distribution
- `GET /api/v1/playlists` — List all published and draft playlists.
- `POST /api/v1/playlists` — Create a new empty playlist.
- `GET /api/v1/playlists/:id` — Retrieve a playlist by unique ID.
- `DELETE /api/v1/playlists/:id` — Remove a playlist from the catalog and index.
- `POST /api/v1/playlists/:id/publish` — Sign and distribute a verified playlist revision.
- `GET /api/v1/devices/:id/playlist` — Fetch the signed manifest assigned to an edge screen.

### Telemetry & Proof-of-Play
- `POST /api/v1/devices/:id/pop` — Ingest a cryptographic Proof-of-Play record.
- `GET /api/v1/fleet/anomalies` — Execute predictive maintenance scans across the entire fleet.
- `GET /api/v1/metrics` — Retrieve global platform operational statistics.

---

## Security & Verification Guarantees

1. **Zero-Trust Content Integrity**: Every media item declared in a playlist requires a pre-computed SHA-256 hash. The edge player validates this hash before executing render commands, preventing asset tampering and CDN spoofing.
2. **Authentic Ed25519 Cryptography**: All manifest publications and device challenge-response handshakes utilize non-repudiable Ed25519 digital signatures computed via the standard Web Crypto API (`crypto.subtle`), ensuring full mathematical verification without external cryptographic bloat.
3. **Strict Bearer Authorization**: Edge node operations (telemetry ingestion, heartbeats, proof-of-play recording, and manifest synchronization) require cryptographic `Authorization: Bearer <token>` credentials issued exclusively upon verified cryptographic enrollment.
4. **Deterministic Concurrency & Durability**: All entity writes use Compare-And-Swap (`casPut`) optimistic concurrency control backed by durable atomic storage (`worker/durable-storage.ts`), ensuring zero state loss across server reboots.
5. **Graceful Degradation**: If an edge display loses connectivity to the control plane, it transitions smoothly to `cache_fallback` mode, continuously rendering verified local media and queuing PoP records for transmission upon reconnection.

---

## GitHub Pages & Standalone Demo Deployment

OmniScreenMesh includes a client-side execution engine that enables hosting the application as a **100% serverless, zero-maintenance interactive demo on GitHub Pages**.

### Architecture
- **In-Browser Sandbox**: When deployed to `*.github.io` or when disconnected from the live backend, `src/lib/demo-api.ts` transparently intercepts API requests and executes them using the browser's native **Web Crypto API** (for Ed25519 signatures and SHA-256 integrity digests) and `localStorage` for state persistence.
- **Client SPA Routing**: Includes `public/404.html` and history redirect scripts so deep links (e.g. `/fleet`, `/simulator/dev-001`) resolve properly on hard page reloads.
- **Automated CI/CD**: A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) runs linting, the 31-test Vitest suite, and publishes the static bundle.

### Enabling GitHub Pages for Your Repository
1. Push your repository to GitHub.
2. In your GitHub repository, navigate to **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. Push a commit to `main` (or click **Run workflow** in the **Actions** tab) — your demo will be live at `https://<username>.github.io/<repo-name>/`.

---

## License

This project is licensed under the MIT License.
