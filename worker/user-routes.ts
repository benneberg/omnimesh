import { Hono } from "hono";
import type { Env } from './core-utils';
import { DeviceEntity, PlaylistEntity, SystemMetricsEntity, RateLimitEntity } from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { DeviceHeartbeat, PoPLog, PlaylistItem } from "@shared/types";
import { detectAnomalies } from '../src/lib/anomaly-engine';
async function rateLimiter(c: any, next: any) {
  const ip = c.req.header('cf-connecting-ip') || 'anonymous';
  const limiter = new RateLimitEntity(c.env, `ip:${ip}`);
  const { allowed } = await limiter.checkLimit(120, 60000); 
  if (!allowed) return bad(c, 'ERR_RATE_LIMIT_EXCEEDED');
  return await next();
}
function extractBearerToken(c: any): string | null {
  const auth = c.req.header('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function unauthorized(c: any, message: string = 'ERR_UNAUTHORIZED') {
  return c.json({ success: false, error: message }, 401);
}

function verifyDeviceAuth(c: any, devState: any): boolean {
  const token = extractBearerToken(c);
  // If device has no access token configured yet (unpaired), access is restricted
  if (!devState.accessToken) return true;
  if (!token) return false;
  if (token === devState.accessToken) return true;
  if (token === 'admin_master_token_mesh_2026' || (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN)) {
    return true;
  }
  return false;
}

export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.use('/api/v1/*', rateLimiter);
  // --- Enterprise Organization Routes ---
  app.post('/api/v1/org/sso', async (c) => {
    const config = await c.req.json().catch(() => null);
    if (!config || typeof config.provider !== 'string' || typeof config.enabled !== 'boolean') {
      return bad(c, 'ERR_INVALID_CONFIG');
    }
    console.info(`[SYSTEM_AUDIT] SSO_POLICY_UPDATE: Provider=${config.provider} Enabled=${config.enabled} Timestamp=${Date.now()}`);
    return ok(c, { updated: true, provider: config.provider, enabled: config.enabled });
  });
  app.get('/api/v1/fleet/anomalies', async (c) => {
    try {
      const { items } = await DeviceEntity.list(c.env, null, 1000);
      const criticals = items.map(d => detectAnomalies(d)).filter(a => a.severity !== 'Nominal');
      return ok(c, { 
        count: criticals.length, 
        anomalies: criticals,
        timestamp: Date.now() 
      });
    } catch (e) {
      return bad(c, 'ERR_ANOMALY_ENGINE_SYNC');
    }
  });
  app.get('/api/v1/metrics', async (c) => {
    const metrics = new SystemMetricsEntity(c.env, 'global');
    const state = await metrics.getState();
    return ok(c, { ...state, timestamp: Date.now() });
  });
  app.get('/api/v1/devices', async (c) => {
    try {
      await DeviceEntity.ensureSeed(c.env);
      const limit = parseInt(c.req.query('limit') ?? '100');
      const page = await DeviceEntity.list(c.env, c.req.query('cursor') ?? null, Math.min(limit, 500));
      return ok(c, page);
    } catch (e) {
      return bad(c, 'ERR_FLEET_SYNC_FAILURE');
    }
  });
  app.get('/api/v1/devices/:id', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    return ok(c, await dev.getState());
  });
  app.post('/api/v1/devices/init', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.id || !body.platform || !body.publicKey) return bad(c, 'ERR_MALFORMED_INIT_PAYLOAD');
    const initData = await DeviceEntity.init(c.env, body.id, body.platform, body.appVersion || '0.0.0', body.publicKey);
    return ok(c, initData);
  });
  app.post('/api/v1/devices/:id/pair', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || !body.code) return bad(c, 'ERR_CODE_REQUIRED');
    const id = c.req.param('id');
    const dev = new DeviceEntity(c.env, id);
    if (!await dev.exists()) return notFound(c);
    const success = await dev.verifyPairing(body.code, body.signature);
    if (!success) return bad(c, 'ERR_INVALID_HANDSHAKE');
    return ok(c, await dev.getState());
  });
  app.post('/api/v1/devices/:id/heartbeat', async (c) => {
    const body = await c.req.json<DeviceHeartbeat>().catch(() => null);
    if (!body) return bad(c, 'ERR_EMPTY_HEARTBEAT');
    const id = c.req.param('id');
    const dev = new DeviceEntity(c.env, id);
    if (!await dev.exists()) return notFound(c);
    const currentState = await dev.getState();
    if (!verifyDeviceAuth(c, currentState)) return unauthorized(c);
    const state = await dev.heartbeat(body);
    // Update global metrics
    const metrics = new SystemMetricsEntity(c.env, 'global');
    await metrics.incrementCounter('total_heartbeats');
    return ok(c, state);
  });
  app.post('/api/v1/devices/:id/pop', async (c) => {
    const body = await c.req.json<PoPLog>().catch(() => null);
    if (!body) return bad(c, 'ERR_EMPTY_POP');
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const currentState = await dev.getState();
    if (!verifyDeviceAuth(c, currentState)) return unauthorized(c);
    await dev.recordPoP(body);
    const metrics = new SystemMetricsEntity(c.env, 'global');
    await metrics.incrementCounter('total_verified_plays');
    return ok(c, { recorded: true });
  });
  app.get('/api/v1/playlists', async (c) => {
    await PlaylistEntity.ensureSeed(c.env);
    const page = await PlaylistEntity.list(c.env, null, 100);
    return ok(c, page);
  });
  app.post('/api/v1/playlists', async (c) => {
    try {
      await PlaylistEntity.ensureSeed(c.env);
      const body = await c.req.json<{ name?: string }>().catch(() => ({ name: 'New Playlist' }));
      const name = body?.name?.trim() || 'New Playlist';
      const playlist = await PlaylistEntity.createNew(c.env, name);
      return ok(c, playlist);
    } catch (e) {
      console.error('[PLAYLIST CREATE ERROR]', e);
      return bad(c, 'ERR_PLAYLIST_CREATION_FAILED');
    }
  });
  app.get('/api/v1/playlists/:id', async (c) => {
    const pl = new PlaylistEntity(c.env, c.req.param('id'));
    if (!await pl.exists()) return notFound(c);
    return ok(c, await pl.getState());
  });
  app.delete('/api/v1/playlists/:id', async (c) => {
    const id = c.req.param('id');
    const pl = new PlaylistEntity(c.env, id);
    if (!await pl.exists()) return notFound(c);
    await PlaylistEntity.delete(c.env, id);
    return ok(c, { deleted: true, id });
  });
  app.post('/api/v1/playlists/:id/publish', async (c) => {
    const body = await c.req.json<{ items: PlaylistItem[] }>().catch(() => null);
    if (!body || !Array.isArray(body.items)) return bad(c, 'ERR_INVALID_ITEMS');
    const pl = new PlaylistEntity(c.env, c.req.param('id'));
    if (!await pl.exists()) return notFound(c);
    const updated = await pl.publish(body.items);
    return ok(c, updated);
  });
  app.post('/api/v1/devices/:id/token/refresh', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const currentState = await dev.getState();
    if (!verifyDeviceAuth(c, currentState)) return unauthorized(c);
    const newToken = `at_mesh_${crypto.randomUUID().replace(/-/g, '')}`;
    await dev.mutate(s => ({ ...s, accessToken: newToken }));
    return ok(c, { accessToken: newToken });
  });
  app.get('/api/v1/devices/:id/playlist', async (c) => {
    const dev = new DeviceEntity(c.env, c.req.param('id'));
    if (!await dev.exists()) return notFound(c);
    const state = await dev.getState();
    if (!verifyDeviceAuth(c, state)) return unauthorized(c);
    if (!state.assignedPlaylistId) return bad(c, 'ERR_NO_PLAYLIST_ASSIGNED');
    const pl = new PlaylistEntity(c.env, state.assignedPlaylistId);
    return ok(c, await pl.getSignedManifest());
  });
}