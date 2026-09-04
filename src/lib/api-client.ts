import { ApiResponse } from "../../shared/types"
import { toast } from "sonner";
const AUTH_KEY = 'omnisign_auth_tokens';
export function saveAuth(deviceId: string, accessToken: string) {
  if (!deviceId) return;
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  current[deviceId] = accessToken;
  localStorage.setItem(AUTH_KEY, JSON.stringify(current));
}
export function getAuth(deviceId: string): string | null {
  const current = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  return current[deviceId] || null;
}
export async function api<T>(path: string, init?: RequestInit & { timeout?: number }): Promise<T> {
  const start = performance.now();
  const cleanPath = path.replace(/^\/api\/v1/, '').replace(/^\/v1/, '').replace(/^\//, '').replace(/\/$/, '');
  const finalPath = `/api/v1/${cleanPath}`;
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  const segments = cleanPath.split('/');
  const deviceIdx = segments.indexOf('devices');
  const deviceId = (deviceIdx !== -1 && segments[deviceIdx + 1] && segments[deviceIdx + 1] !== 'init') 
    ? segments[deviceIdx + 1] 
    : null;
  const EXCLUDED_IDS = ['init', 'registry', 'playlists', 'health', 'metrics', 'pair'];
  if (deviceId && !EXCLUDED_IDS.includes(deviceId)) {
    const token = getAuth(deviceId);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), init?.timeout || 15000);
  try {
    const res = await fetch(finalPath, { 
      ...init, 
      headers,
      signal: controller.signal 
    });
    clearTimeout(id);
    const latency = performance.now() - start;
    if (res.status === 429) {
      toast.error("Rate Limit Exceeded", { description: "Please wait 60 seconds before retrying system sync." });
      throw new Error("ERR_RATE_LIMIT_EXCEEDED");
    }
    if (latency > 1500) {
      console.warn(`[TELEMETRY] High latency on ${finalPath}: ${latency.toFixed(2)}ms`);
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("[API_ERROR] Expected JSON, got:", text.slice(0, 100));
      throw new Error(`Server returned non-JSON response (${res.status})`);
    }
    const json = await res.json() as ApiResponse<T>;
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Request failed with status ${res.status}`);
    }
    return json.data as T;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("Request timed out after 15s");
    }
    console.error(`[API_FAILURE] Path: ${finalPath}`, e);
    throw e;
  }
}