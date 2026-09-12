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
    <AppLayout container>
      <div className="space-y-6 sm:space-y-10 max-w-5xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-emerald-500/20 mb-4 sm:mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Provisioning Guide v1.2</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Device Provisioning
          </h1>
          <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground mt-2 sm:mt-4 max-w-2xl mx-auto">
            Secure 6-step workflow for onboarding ScreenMesh nodes with cryptographic identity verification.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="p-4 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <h3 className="text-xl sm:text-2xl font-black mb-4 flex items-center gap-2">
                <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500 shrink-0" />
                Quick Start
              </h3>
              <ol className="space-y-3 text-xs sm:text-sm">
                <li>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">1</div>
                    <span className="leading-relaxed">Fleet Monitor → <Button variant="outline" size="sm" className="ml-1 h-7 text-xs">Provision Node</Button></span>
                  </div>
                </li>
                <li>
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">2</div>
                    <span className="leading-relaxed">Copy pairing code → <Badge className="font-mono text-[10px] sm:text-[11px] ml-1">483920</Badge></span>
                  </div>
                </li>
                <li>
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-xs mt-0.5">✓</div>
                    <span className="leading-relaxed">Launch <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">/simulator/dev-001</code></span>
                  </div>
                </li>
              </ol>
              <a href="/simulator/dev-001" target="_blank" rel="noreferrer">
                <Button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 font-bold h-11 sm:h-12 rounded-xl shadow-primary text-xs sm:text-sm">
                  Launch Simulator →
                </Button>
              </a>
            </div>
            <Card className="shadow-soft border-slate-200 dark:border-white/10">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  Security Guarantees
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Every step is cryptographically verified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Ed25519 Challenge-Response</div>
                    <div className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400">Prevents device spoofing attacks</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                  <Key className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-xs sm:text-sm">SHA256 Manifest Signing</div>
                    <div className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400">Content integrity guaranteed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              {PROVISION_STEPS.map((step, idx) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <div className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-muted/30 dark:from-slate-900 dark:to-slate-800/50 hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-950/30 dark:hover:to-blue-950/30 border border-slate-200 dark:border-white/10 group-hover:border-indigo-200 transition-all duration-300 hover:shadow-md">
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-shrink-0 mt-0.5">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm ${
                        step.complete 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {step.complete ? '✓' : step.number}
                      </div>
                      <div className="w-0.5 sm:w-1 h-8 sm:h-10 bg-gradient-to-b from-indigo-200 to-transparent dark:from-indigo-800" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        <step.icon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 opacity-75 shrink-0" />
                        <h4 className="font-bold text-sm sm:text-base truncate">{step.title}</h4>
                        {step.complete && <Badge className="ml-auto text-[9px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">Complete</Badge>}
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Card className="shadow-soft border-slate-200 dark:border-white/10">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">Supported Platforms</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-4 sm:p-6 pt-0 text-xs sm:text-sm">
                {[
                  { platform: "WebOS 6.x/8.x", status: "Primary" },
                  { platform: "Tizen 2019+", status: "Stable" },
                  { platform: "ChromeOS Kiosk", status: "Beta" },
                  { platform: "SignageOS", status: "Beta" },
                  { platform: "Browser Fallback", status: "Simulator" }
                ].map((plat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/30 rounded-lg">
                    <span className="font-mono text-xs truncate mr-2">{plat.platform}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{plat.status}</Badge>
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