import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Code } from "@/components/ui/code"
import { Shield, Key, Play, Monitor, Zap } from "lucide-react"
const API_ENDPOINTS = [
  {
    group: "Device Orchestration",
    icon: Monitor,
    endpoints: [
      {
        method: "POST",
        path: "/v1/devices/init",
        description: "Register new device and generate pairing challenge",
        params: [],
        body: `{
  "platform": "webos|tizen|chromeos|signageos|browser",
  "appVersion": "3.1.0-STABLE",
  "publicKey": "Ed25519_public_key_base64"
}`,
        response: `{
  "deviceId": "dev-001",
  "pairingCode": "483920",
  "pairingExpiresAt": 1735689600000,
  "challenge": "challenge_nonce_uuid"
}`,
        headers: []
      },
      {
        method: "POST",
        path: "/v1/devices/:id/pair",
        description: "Complete cryptographic pairing handshake",
        params: ["id: deviceId"],
        body: `{
  "code": "483920",
  "signature": "Ed25519_signature_base64"
}`,
        response: `{
  "accessToken": "at_mesh_xxx",
  "refreshToken": "rt_mesh_xxx",
  "status": "active"
}`,
        headers: []
      },
      {
        method: "POST",
        path: "/v1/devices/:id/heartbeat",
        description: "Secure telemetry heartbeat with anti-spoof signature",
        params: ["id: deviceId"],
        body: `{
  "status": "active",
  "platform": "webos",
  "appVersion": "3.1.0",
  "telemetry": { ... },
  "signature": "signed_expected_nonce"
}`,
        response: `{
  "expectedNonce": "next_challenge",
  "nextSyncInterval": 60000
}`,
        headers: ["Authorization: Bearer <accessToken>"]
      },
      {
        method: "GET",
        path: "/v1/devices/:id/playlist",
        description: "Fetch signed playlist manifest (traffic-shaped)",
        params: ["id: deviceId"],
        body: null,
        response: "Signed Manifest JSON",
        headers: ["Authorization: Bearer <accessToken>", "X-Playlist-Version: 5"]
      },
      {
        method: "POST",
        path: "/v1/devices/:id/token/refresh",
        description: "Rotate access token (24h TTL)",
        params: ["id: deviceId"],
        body: null,
        response: `{ "accessToken": "new_token" }`,
        headers: []
      }
    ]
  },
  {
    group: "Playlist Management",
    icon: Play,
    endpoints: [
      {
        method: "GET",
        path: "/v1/playlists",
        description: "List all available playlists",
        params: [],
        body: null,
        response: `{ "items": Playlist[], "next": "cursor" }`,
        headers: []
      },
      {
        method: "POST",
        path: "/v1/playlists",
        description: "Create new empty playlist",
        params: [],
        body: `{ "name": "Main Lobby" }`,
        response: `Playlist`,
        headers: []
      },
      {
        method: "POST",
        path: "/v1/playlists/:id/publish",
        description: "Sign & publish new playlist revision (requires SHA256 hashes)",
        params: ["id: playlistId"],
        body: `{
  "items": [
    {
      "id": "pi-1",
      "type": "image|video|html|url",
      "url": "https://cdn...",
      "integrity": "sha256_hex",
      "durationMs": 5000
    }
  ]
}`,
        response: `Playlist (version incremented)`,
        headers: []
      }
    ]
  },
  {
    group: "Traffic Shaping & Security",
    icon: Zap,
    endpoints: [
      {
        method: "GET",
        path: "/v1/devices",
        description: "List fleet devices with pagination",
        params: ["cursor?: string", "limit?: number"],
        body: null,
        response: `{ "items": Device[], "next": "cursor" }`,
        headers: []
      }
    ]
  }
]
export function DocsPage() {
  return (
    <AppLayout container>
      <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-2xl shrink-0">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">API Reference v1.1</h1>
              <p className="text-sm sm:text-xl text-muted-foreground">OmniSign Control Plane - Secure Device Orchestration</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-mono">Ed25519</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-mono">SHA256</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-mono">JWT 24h</Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-mono">Traffic Shaped</Badge>
          </div>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {API_ENDPOINTS.map(({ group, icon: Icon, endpoints }) => (
            <div key={group} className="border rounded-2xl p-4 sm:p-6 bg-card shadow-soft hover:shadow-lg transition-all min-w-0">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base sm:text-lg truncate">{group}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{endpoints.length} endpoints</p>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {endpoints.map((endpoint, idx) => (
                  <Accordion type="single" collapsible key={idx}>
                    <AccordionItem value={`item-${idx}`} className="border-b-0">
                      <AccordionTrigger className="hover:no-underline h-auto p-2.5 sm:p-3 -m-2 sm:-m-3 rounded-lg hover:bg-muted/50 data-[state=open]:bg-muted/30">
                        <div className="flex items-center gap-2 sm:gap-3 w-full justify-between min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <Code className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shrink-0 ${
                              endpoint.method === 'POST' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                              endpoint.method === 'GET' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300' : 'bg-muted text-muted-foreground'
                            }`}>
                              {endpoint.method}
                            </Code>
                            <span className="font-mono text-xs sm:text-sm truncate text-left">{endpoint.path}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 sm:pt-4 space-y-3 sm:space-y-4 text-xs sm:text-sm">
                        <p className="text-muted-foreground">{endpoint.description}</p>
                        {endpoint.params.length > 0 && (
                          <div>
                            <div className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Path Parameters</div>
                            <div className="text-[10px] font-mono bg-muted/50 p-2 rounded-md break-all">
                              {endpoint.params.join(', ')}
                            </div>
                          </div>
                        )}
                        {endpoint.headers.length > 0 && (
                          <div>
                            <div className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Headers</div>
                            <div className="text-[10px] font-mono bg-muted/50 p-2 rounded-md space-y-1 break-all">
                              {endpoint.headers.map(h => <div key={h}>{h}</div>)}
                            </div>
                          </div>
                        )}
                        {endpoint.body !== null && (
                          <div>
                            <div className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Request Body</div>
                            <Code className="block w-full p-2.5 sm:p-3 text-[10px] sm:text-xs font-mono bg-muted/50 rounded-md whitespace-pre-wrap break-all overflow-x-auto">
                              {endpoint.body}
                            </Code>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1">Response</div>
                          <Code className="block w-full p-2.5 sm:p-3 text-[10px] sm:text-xs font-mono bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-md whitespace-pre-wrap break-all overflow-x-auto">
                            {endpoint.response}
                          </Code>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 sm:p-8 rounded-2xl border border-dashed border-muted bg-muted/20 text-center">
          <Key className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4 opacity-50" />
          <h3 className="text-lg sm:text-xl font-bold mb-2">Security Model</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-4">
            All endpoints use Ed25519 challenge-response + SHA256 content verification. 
            Heartbeats include anti-spoof signatures. Traffic shaping prevents thundering herd.
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center text-[10px] sm:text-xs">
            <Badge variant="outline">Challenge-Response</Badge>
            <Badge variant="outline">Signed Manifests</Badge>
            <Badge variant="outline">X-Next-Sync</Badge>
            <Badge variant="outline">Atomic Writes</Badge>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}