# OmniScreenMesh Architecture Specification

## 1. System Overview

**OmniScreenMesh** is a next-generation distributed digital signage control plane and edge orchestration platform. It is engineered for ultra-resilient multi-screen synchronization across heterogeneous hardware environments (LG webOS, Samsung Tizen, ChromeOS, signageOS, and headless browser runtimes).

The platform addresses three core challenges in enterprise digital signage networks:
1. **Cryptographic Integrity & Verifiable Proof-of-Play (PoP)**: Ensuring that displayed advertisements, mission-critical messages, and regulatory notices are cryptographically verifiable and tamper-proof.
2. **Edge Resiliency & P2P Mesh Caching**: Alleviating bandwidth bottlenecks and preventing screen blackouts during WAN connectivity drops through localized peer-to-peer asset gossip and fallback caching.
3. **Predictive Maintenance & Fleet Telemetry**: Ingesting real-time hardware vitals (CPU, memory, disk, render latency, watchdog timeouts) to detect thermal throttling and memory leaks before screen crashes occur.

---

## 2. High-Level System Topology

```
+-----------------------------------------------------------------------------------------+
|                                    OPERATOR / ADMIN                                     |
|                      Desktop Browser / Enterprise Security Operator                     |
+-----------------------------------------------------------------------------------------+
                                             |
                                     HTTPS / REST API
                                             v
+-----------------------------------------------------------------------------------------+
|                               OMNISCREENMESH HOST RUNTIME                                |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                            Express Ingress Gateway (Port 3000)                    |  |
|  |   - SPA Static Asset Delivery (Vite development middleware or dist/ bundle)      |  |
|  |   - Reverse-proxy routing for /api/* requests with body stream normalization      |  |
|  +-----------------------------------------------------------------------------------+  |
|                                            |                                            |
|                                            v                                            |
|  +-----------------------------------------------------------------------------------+  |
|  |                         Hono API Gateway & Routing Kernel                         |  |
|  |   - CORS & Request Logging                                                        |  |
|  |   - Sliding-Window Rate Limiting (RateLimitEntity)                                |  |
|  |   - Enterprise SSO Policy Router                                                  |  |
|  |   - Fleet Telemetry, Playlist Manifest, & Device Enrollment Handlers             |  |
|  +-----------------------------------------------------------------------------------+  |
|                                            |                                            |
|                                            v                                            |
|  +-----------------------------------------------------------------------------------+  |
|  |                    Entity Data Layer (Durable Object Pattern)                     |  |
|  |                                                                                   |  |
|  |    +-------------------+    +--------------------+    +-----------------------+   |  |
|  |    |   DeviceEntity    |    |   PlaylistEntity   |    |  SystemMetricsEntity  |   |  |
|  |    |  (State + Vitals) |    |  (Manifest + Rev)  |    |  (Aggregated Stats)   |   |  |
|  |    +-------------------+    +--------------------+    +-----------------------+   |  |
|  |              |                        |                           |               |  |
|  |              +------------------------+---------------------------+               |  |
|  |                                       v                                           |  |
|  |                  GlobalDurableObject Storage Engine                               |  |
|  |      - Isolated namespace partitions per entity instance                          |  |
|  |      - Compare-And-Swap (CAS) optimistic concurrency control                      |  |
|  |      - IndexedEntity prefix indexing (i:<id>) with cursor-based pagination       |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
                                             ^
                                             | HTTP Heartbeats / PoP Logs / Manifest Sync
                                             v
+-----------------------------------------------------------------------------------------+
|                               EDGE DISPLAY NODES & SIMULATOR                            |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                         Screen Simulator / Physical Device                        |  |
|  |   - Cryptographic Keypair (Ed25519) & Pairing Challenge Handshake                 |  |
|  |   - 10-Second Telemetry Loop (Vitals, Rendering Errors, Watchdog Escalations)     |  |
|  |   - Cache-First Asset Pipeline (Local storage cache -> P2P Peer Mesh -> CDN)      |  |
|  |   - Cryptographic Proof-of-Play (PoP) Generation on Media Completion              |  |
|  |   - Watchdog State Machine (Nominal -> Watchdog Recovery -> Cache Fallback)       |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Core Architectural Pillars

### 3.1 Dual-Kernel Server Architecture (Express + Hono)

The application unifies an **Express 4 reverse-proxy server** and a **Hono micro-framework router**:
- **Ingress (`server.ts`)**: Binds strictly to `0.0.0.0:3000`. In development, it integrates Vite’s native middleware (`createServer({ server: { middlewareMode: true } })`) for zero-build client rendering. In production, it serves precompiled static assets from `dist/` with SPA index fallback.
- **Routing Engine (`worker/user-routes.ts` & `worker/index.ts`)**: Built with Hono to support standard web `Request`/`Response` primitives. All requests matching `/api/*` are intercepted by Express and forwarded to Hono’s `app.fetch(webReq, defaultEnv)` dispatcher.

### 3.2 State Management & Persistence (Durable Object Pattern)

The system is designed around the **Cloudflare Durable Objects actor model**:
- **Entity (`worker/core-utils.ts`)**: Abstract base class representing a stateful actor. Implements Compare-And-Swap (`casPut`) versioning to eliminate race conditions without distributed locks.
- **IndexedEntity (`worker/core-utils.ts`)**: Extends `Entity` to provide prefix-based indexing (`Index<T>`) for collections. Guarantees $O(1)$ identity lookups and cursor-driven paging over sorted keys.
- **Durable Storage Engine (`worker/durable-storage.ts` & `GlobalDurableObject`)**: Cloudflare's native `DurableObject` actor runtime is implemented in Node.js container environments via an atomic, file-backed durable storage engine (`/data/omnisign-storage.json`). Each entity instance operates on an isolated transactional partition supporting atomic CAS operations (`casPut`, `del`, `listPrefix`, `indexAddBatch`). Mutations are cached in memory for sub-millisecond read/write latency and debounced to disk atomically via temporary file swaps, guaranteeing state persistence across process restarts without external database dependencies.

### 3.3 Cryptographic Trust Framework

Every communication channel and displayed asset operates under zero-trust verification:
- **Device Pairing Handshake**:
  1. Unprovisioned devices initiate `/api/v1/devices/init` with their public key and platform metadata.
  2. The server yields a short-lived, single-use 6-digit pairing code and a cryptographic challenge UUID.
  3. The operator inputs the code in the admin dashboard, triggering `/api/v1/devices/:id/pair` with an Ed25519 signature of the challenge.
  4. Upon verification, the node is granted an active JWT bearer token (`at_mesh_*`).
- **Manifest Signing**:
  Playlists published via `/api/v1/playlists/:id/publish` require every layer to carry a valid SHA-256 content integrity hash. The control plane signs the compiled manifest with the root private key, embedding `signerPublicKey`, `etag`, and timestamped signatures.
- **Proof-of-Play (PoP) Auditing**:
  Upon completing asset playback, the edge player computes:
  $$\text{PoP} = \text{Sign}_{\text{DevicePrivKey}}(\text{deviceId} \parallel \text{playlistItemId} \parallel \text{contentHash} \parallel \text{timestamp} \parallel \text{durationMs})$$
  This log is transmitted to `/api/v1/devices/:id/pop` for non-repudiable audit logging.

### 3.4 P2P Mesh Caching Subsystem

In high-density physical installations (e.g., airports, stadiums, retail malls), multiple screens share the same local network:
1. **Asset Interception**: Before requesting high-bitrate video or image layers from origin CDNs, the player checks its local IndexedDB/memory cache.
2. **Local Swarm Discovery**: If absent locally, the node broadcasts an availability query to peer screens via WebRTC/LAN hints.
3. **P2P Ingestion**: If a peer holds the verified chunk, it is transferred over the local mesh. The node validates the chunk against the manifest’s SHA-256 hash before rendering.
4. **Bandwidth Savings Accounting**: Successful local hits increment `meshHits` on the device and update `mesh_savings_total` in `SystemMetricsEntity`.

### 3.5 Predictive Telemetry & Anomaly Detection Engine

The client and server continuously evaluate hardware degradation through `src/lib/anomaly-engine.ts`:
- **Memory Leak Detection**: Computes a moving window ($\Delta t \ge 5$ cycles) of memory utilization. Linear positive drift exceeding $15\%$ without garbage-collection drops triggers a `Warning`, and drift exceeding $30\%$ triggers a `Critical` alert.
- **CPU Saturation & Thermal Throttling**: Monitors execution load across cores. If the trailing 3 telemetry cycles sustain $>90\%$ CPU usage, a critical watchdog recovery event is flagged.
- **Network Jitter & Playback Failure Spike**: If playback errors exceed 5 events in a sliding window, the anomaly engine flags upstream network degradation and orders local cache retention.

---

## 4. Key Data Entities

| Entity | Storage Key | Primary Attributes | Lifecycle Hooks |
| :--- | :--- | :--- | :--- |
| **`DeviceEntity`** | `device:{id}` | `id`, `orgId`, `name`, `status`, `platform`, `telemetry`, `popLogs`, `p2pMetrics`, `metricsHistory` | `init`, `generatePairingCode`, `verifyPairing`, `heartbeat`, `recordPoP` |
| **`PlaylistEntity`** | `playlist:{id}` | `id`, `name`, `version`, `updatedAt`, `items[]` (with SHA-256 integrity, duration, transition) | `createNew`, `publish`, `getSignedManifest` |
| **`SystemMetricsEntity`** | `sys-metrics:{id}` | Counters: `total_heartbeats`, `successful_pairings`, `total_verified_plays`, `mesh_savings_total` | `incrementCounter`, `getState` |
| **`RateLimitEntity`** | `ratelimit:{ip}` | `windowStart`, `requestCount` | `checkLimit` (120 req / 60s window) |

---

## 5. End-to-End Operational Workflows

### 5.1 Device Provisioning & Cryptographic Handshake

```
+---------------+              +--------------------+              +-------------------+
| Edge Terminal |              | Control Plane API  |              |  Admin Dashboard  |
+---------------+              +--------------------+              +-------------------+
        |                                |                                   |
        |--- 1. POST /devices/init ----->|                                   |
        |    (pubKey, platform, version) |                                   |
        |                                |--- 2. Create DeviceEntity ------->|
        |<-- 3. Returns code & challenge |       (status: 'pairing')         |
        |                                |                                   |
   [Display Code]                        |                                   |
        |                                |                                   |
        |                                |<-- 4. Operator enters code -------|
        |                                |    POST /devices/:id/pair         |
        |                                |                                   |
        |                                |--- 5. Verify challenge & code --->|
        |                                |       Transition to 'active'      |
        |<-- 6. Issue Access Token ------|       Issue accessToken           |
```

### 5.2 Content Scheduling, Integrity Verification, & Distribution

```
+--------------------+        +---------------------+        +--------------------+
|  Content Creator   |        |  Control Plane API  |        | Edge Display Node  |
+--------------------+        +---------------------+        +--------------------+
          |                              |                              |
          |--- 1. Build Layers --------->|                              |
          |    (Images, Videos, HTML)    |                              |
          |                              |                              |
          |--- 2. Compute SHA-256 ------>|                              |
          |    (Enforce content hash)    |                              |
          |                              |                              |
          |--- 3. POST /publish -------->|                              |
          |                              |--- 4. Sign Manifest -------->|
          |                              |    (Root Ed25519 signature)  |
          |                              |                              |
          |                              |<-- 5. GET /devices/:id/plist-|
          |                              |    (Poll or WebSocket push)  |
          |                              |                              |
          |                              |--- 6. Return Signed Manifest>|
          |                              |                              |
          |                              |                     [Verify SHA-256]
          |                              |                     [Render Media]
          |                              |                              |
          |                              |<-- 7. POST /devices/:id/pop -|
          |                              |    (Signed Proof-of-Play)    |
```

---

## 6. Frontend Architectural Blueprint

The user interface is constructed using a high-density, performance-optimized React component architecture:
- **Navigation & Routing**: React Router v6 DOM with centralized route definitions and `<RouteErrorBoundary>` guards.
- **Server Cache & Invalidation**: `@tanstack/react-query` managing server state, background revalidation (5s stale time), and optimistic UI updates for playlist publishing and device status changes.
- **Layer Re-ordering**: `@dnd-kit/core` and `@dnd-kit/sortable` delivering fluid drag-and-drop layer sequencing for multi-zone and sequential content composition.
- **Telemetry Visualizations**: Recharts rendering rolling 20-sample CPU and memory time-series charts directly inside the fleet management inspection drawer.
- **Design System & Components**: Tailwind CSS v3 with `@radix-ui` headless primitives (Dialog, DropdownMenu, Tabs, Tooltip, Collapsible, Progress, Slider, Switch, ScrollArea).

---

## 7. Operational Modes & Failure Recovery

| Mode | Trigger Condition | Automated System Response |
| :--- | :--- | :--- |
| **Nominal Operation** | Normal network connectivity, valid heartbeat within 60s | Edge plays active playlist; transmits PoP logs and hardware vitals on 10s intervals. |
| **Watchdog Recovery** | Chromium/hardware render crash, memory spike $>90\%$ | Local watchdog daemon force-restarts the rendering webview; resumes from the last verified layer checkpoint. |
| **Cache Fallback** | Control plane unreachable (WAN outage) | Edge node continues playback indefinitely using verified local disk cache; queues PoP records locally for burst transmission upon reconnect. |
| **Emergency Mode** | Administrative override flag broadcast from control plane | Overrides all active commercial playlists; renders high-contrast, localized emergency evacuation or safety instructions. |

---

## 8. Directory Structure & Code Organization

```
├── /index.html               # Main HTML entry point with telemetry beacon error reporter
├── /server.ts                # Express server entry point with Vite middleware & Hono proxy
├── /package.json             # Root dependency configuration and build scripts
├── /tsconfig.json            # Strict TypeScript configuration with @ and @shared aliases
├── /vite.config.ts           # Vite build and plugin configuration
├── /metadata.json            # AI Studio application metadata and capabilities
├── /worker/                  # Backend control plane microservice
│   ├── index.ts              # Hono application initialization, logger, and CORS
│   ├── core-utils.ts         # Durable Object base abstractions, in-memory engine, and indexing
│   ├── entities.ts           # Domain entities: DeviceEntity, PlaylistEntity, SystemMetricsEntity
│   └── user-routes.ts        # REST API endpoints for fleet, playlists, anomalies, and metrics
├── /shared/                  # Isomorphic types and shared constants
│   ├── types.ts              # TypeScript interfaces for devices, playlists, manifests, telemetry
│   └── mock-data.ts          # Seed data for initial database bootstrapping
└── /src/                     # Frontend single-page application
    ├── main.tsx              # React entry point, QueryClient, and BrowserRouter routing
    ├── index.css             # Tailwind CSS entry point and design system variables
    ├── pages/                # Primary application views
    │   ├── HomePage.tsx      # Executive fleet dashboard, health anomalies, quick stats
    │   ├── FleetPage.tsx     # Full device inventory, search, filters, telemetry drawer
    │   ├── PlaylistsPage.tsx # Manifest visual editor, layer reordering, cryptographic signing
    │   ├── SimulatorPage.tsx # Interactive edge screen player simulator with hardware controls
    │   ├── ProvisionPage.tsx # Cryptographic pairing and device enrollment workflow
    │   ├── SettingsPage.tsx  # SSO policy, cluster configuration, API security settings
    │   └── DocsPage.tsx      # Interactive OpenAPI-style documentation with cURL examples
    ├── components/           # UI components, layout, and Radix wrappers
    └── lib/                  # Client utilities (api-client, anomaly-engine, crypto helpers)
```
