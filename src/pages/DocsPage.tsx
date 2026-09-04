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
    <AppLayout container className="max-w-6xl">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-indigo-500" />
            <div>
              <h1 className="text-4xl font-black tracking-tight">API Reference v1.1</h1>
              <p className="text-xl text-muted-foreground">OmniSign Control Plane - Secure Device Orchestration</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs font-mono">Ed25519</Badge>
            <Badge variant="secondary" className="text-xs font-mono">SHA256</Badge>
            <Badge variant="secondary" className="text-xs font-mono">JWT 24h</Badge>
            <Badge variant="secondary" className="text-xs font-mono">Traffic Shaped</Badge>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {API_ENDPOINTS.map(({ group, icon: Icon, endpoints }) => (
            <div key={group} className="border rounded-2xl p-6 bg-card shadow-soft hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{group}</h3>
                  <p className="text-sm text-muted-foreground">{endpoints.length} endpoints</p>
                </div>
              </div>
              <div className="space-y-4">
                {endpoints.map((endpoint, idx) => (
                  <Accordion type="single" collapsible key={idx}>
                    <AccordionItem value={`item-${idx}`}>
                      <AccordionTrigger className="hover:no-underline h-auto p-3 -m-3 rounded-lg hover:bg-muted/50 data-[state=open]:bg-muted/30">
                        <div className="flex items-center gap-3 w-full justify-between">
                          <div className="flex items-center gap-3">
                            <Code className={`text-xs font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground ${
                              endpoint.method === 'POST' ? 'bg-emerald-100 text-emerald-800' :
                              endpoint.method === 'GET' ? 'bg-indigo-100 text-indigo-800' : ''
                            }`}>
                              {endpoint.method}
                            </Code>
                            <span className="font-mono text-sm">{endpoint.path}</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4 text-sm">
                        <p className="text-muted-foreground">{endpoint.description}</p>
                        {endpoint.params.length > 0 && (
                          <div>
                            <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Path Parameters</div>
                            <div className="text-[10px] font-mono bg-muted/50 p-2 rounded-md">
                              {endpoint.params.join(', ')}
                            </div>
                          </div>
                        )}
                        {endpoint.headers.length > 0 && (
                          <div>
                            <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Headers</div>
                            <div className="text-[10px] font-mono bg-muted/50 p-2 rounded-md space-y-1">
                              {endpoint.headers.map(h => <div key={h}>{h}</div>)}
                            </div>
                          </div>
                        )}
                        {endpoint.body !== null && (
                          <div>
                            <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Request Body</div>
                            <Code className="block w-full p-3 text-xs font-mono bg-muted/50 rounded-md whitespace-pre-wrap">
                              {endpoint.body}
                            </Code>
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Response</div>
                          <Code className="block w-full p-3 text-xs font-mono bg-emerald-50 border border-emerald-100 rounded-md whitespace-pre-wrap">
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
        <div className="p-8 rounded-2xl border border-dashed border-muted bg-muted/20 text-center">
          <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Security Model</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            All endpoints use Ed25519 challenge-response + SHA256 content verification. 
            Heartbeats include anti-spoof signatures. Traffic shaping prevents thundering herd.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs">
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