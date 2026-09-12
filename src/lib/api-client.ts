import { ApiResponse } from "../../shared/types"
import { toast } from "sonner";
import { handleDemoApi } from "./demo-api";

const AUTH_KEY = 'omnisign_auth_tokens';

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:' ||
    localStorage.getItem('omnisign_force_demo_mode') === 'true'
  );
}

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

  // If statically hosted on GitHub Pages or user enabled demo mode, immediately route to in-browser demo API
  if (isDemoMode()) {
    return handleDemoApi<T>(cleanPath, init);
  }

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

    // Check if response is non-JSON (e.g. 404 HTML from a static host)
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.info(`[API_FALLBACK] Static server returned non-JSON for ${finalPath}. Switching to in-browser demo engine.`);
      return handleDemoApi<T>(cleanPath, init);
    }

    const json = await res.json() as ApiResponse<T>;
    if (!res.ok || json.success === false) {
      throw new Error(json.error || `Request failed with status ${res.status}`);
    }
    return json.data as T;
  } catch (e) {
    clearTimeout(id);
    // If network request failed (e.g. static hosting with no backend), fall back to in-browser engine
    if (e instanceof TypeError && (e.message.includes('fetch') || e.message.includes('NetworkError'))) {
      console.info(`[API_FALLBACK] Network unreachable for ${finalPath}. Switching to in-browser demo engine.`);
      return handleDemoApi<T>(cleanPath, init);
    }

    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error("Request timed out after 15s");
    }
    console.error(`[API_FAILURE] Path: ${finalPath}`, e);
    throw e;
  }
}
