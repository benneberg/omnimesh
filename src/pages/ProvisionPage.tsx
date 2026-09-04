import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code } from '@/components/ui/code';
import { CheckCircle2, Monitor, Key, QrCode, PlayCircle, ShieldCheck, Zap, DownloadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
const PROVISION_STEPS = [
  {
    number: 1,
    title: "Fleet Monitor",
    description: "Navigate to Fleet Monitor and click Provision Node",
    icon: Monitor,
    complete: true
  },
  {
    number: 2,
    title: "Device Profile",
    description: "Select platform (WebOS 6/8, Tizen, etc.) and app version",
    icon: DownloadCloud,
    complete: true
  },
  {
    number: 3,
    title: "Pairing Challenge",
    description: "Copy 6-digit pairing code (10min TTL)",
    icon: QrCode,
    complete: true
  },
  {
    number: 4,
    title: "ScreenMesh Boot",
    description: "Launch simulator or deploy to target hardware",
    icon: PlayCircle,
    complete: true
  },
  {
    number: 5,
    title: "Cryptographic Handshake",
    description: "Device auto-pairs via Ed25519 challenge-response",
    icon: Key,
    complete: false
  },
  {
    number: 6,
    title: "Active & Orchestrated",
    description: "Device receives first signed manifest, begins playback",
    icon: ShieldCheck,
    complete: false
  }
]
export function ProvisionPage() {
  return (
    <AppLayout container className="max-w-4xl">
      <div className="space-y-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-full border border-emerald-500/20 mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Provisioning Guide v1.2</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Device Provisioning
          </h1>
          <p className="text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
            Secure 6-step workflow for onboarding ScreenMesh nodes with cryptographic identity verification.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
              <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                <Zap className="h-8 w-8 text-indigo-500" />
                Quick Start
              </h3>
              <ol className="space-y-3 text-sm">
                <li>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">1</div>
                    <span>Fleet Monitor → <Button variant="outline" size="sm" className="ml-1 h-7">Provision Node</Button></span>
                  </div>
                </li>
                <li>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">2</div>
                    <span>Copy pairing code → <Badge className="font-mono text-[11px]">483920</Badge></span>
                  </div>
                </li>
                <li><div className="flex items-start gap-2"><div className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">✓</div><span>Launch <Code>/simulator/dev-001</Code></span></div></li>
              </ol>
              <Button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 font-bold h-12 rounded-xl shadow-primary">
                Launch Simulator →
              </Button>
            </div>
            <Card className="shadow-soft border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Security Guarantees
                </CardTitle>
                <CardDescription>Every step is cryptographically verified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">Ed25519 Challenge-Response</div>
                    <div className="text-xs text-emerald-700">Prevents device spoofing attacks</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Key className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-sm">SHA256 Manifest Signing</div>
                    <div className="text-xs text-blue-700">Content integrity guaranteed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              {PROVISION_STEPS.map((step, idx) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-muted/30 hover:from-indigo-50 hover:to-blue-50 border border-slate-200 group-hover:border-indigo-200 transition-all duration-300 hover:shadow-md">
                    <div className="flex flex-col items-center gap-2 flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-lg ${
                        step.complete 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-indigo-100 text-indigo-700 border-2 border-indigo-200'
                      }`}>
                        {step.complete ? '✓' : step.number}
                      </div>
                      <div className="w-1 h-12 bg-gradient-to-b from-indigo-200 to-transparent" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <step.icon className="h-5 w-5 text-indigo-500 opacity-75" />
                        <h4 className="font-bold text-lg">{step.title}</h4>
                        {step.complete && <Badge className="ml-auto text-xs font-bold bg-emerald-100 text-emerald-800">Complete</Badge>}
                      </div>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Card className="shadow-soft border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">Supported Platforms</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { platform: "WebOS 6.x/8.x", status: "Primary" },
                  { platform: "Tizen 2019+", status: "Stable" },
                  { platform: "ChromeOS Kiosk", status: "Beta" },
                  { platform: "SignageOS", status: "Beta" },
                  { platform: "Browser Fallback", status: "Simulator" }
                ].map((plat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="font-mono">{plat.platform}</span>
                    <Badge variant="outline" className="text-xs">{plat.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}