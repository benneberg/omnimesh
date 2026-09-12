import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Shield, Key, Database, Activity, RefreshCw, Cpu, Users, Lock, HardDrive, Download, CheckCircle2, Globe, Rocket, RotateCcw } from 'lucide-react';
import { ROOT_PUB_KEY } from '@shared/mock-data';
import { useAuthStore } from '@/lib/auth-store';
import { NativeBridge } from '@/lib/native-bridge';
import { api, isDemoMode } from '@/lib/api-client';
import { toast } from 'sonner';

export function SettingsPage(): JSX.Element {
  const ssoConfig = useAuthStore(s => s.ssoConfig);
  const updateSso = useAuthStore(s => s.updateSso);
  const isNative = NativeBridge.isNative();
  const [isTesting, setIsTesting] = useState(false);
  const [demoForced, setDemoForced] = useState(() => localStorage.getItem('omnisign_force_demo_mode') === 'true');
  const activeDemo = isDemoMode();

  const toggleForceDemo = () => {
    const next = !demoForced;
    if (next) {
      localStorage.setItem('omnisign_force_demo_mode', 'true');
      toast.success("Standalone Demo Mode Activated", {
        description: "App will now operate using local browser Web Crypto and client storage."
      });
    } else {
      localStorage.removeItem('omnisign_force_demo_mode');
      toast.info("Connected Mode Restored", {
        description: "App will attempt to communicate with the live Express server."
      });
    }
    setDemoForced(next);
    setTimeout(() => window.location.reload(), 600);
  };

  const handleResetDemoData = () => {
    localStorage.removeItem('omnisign_demo_devices');
    localStorage.removeItem('omnisign_demo_playlists');
    localStorage.removeItem('omnisign_demo_metrics');
    localStorage.removeItem('omnisign_demo_sso');
    toast.success("Demo sandbox state reset to default mock state");
    setTimeout(() => window.location.reload(), 500);
  };
  const handleTestSso = async () => {
    setIsTesting(true);
    try {
      // Simulated OIDC Discovery & Handshake
      await new Promise(r => setTimeout(r, 1500));
      toast.success("Identity Provider Discovery Successful", {
        description: "Validated metadata for: " + ssoConfig.provider.toUpperCase()
      });
    } finally {
      setIsTesting(false);
    }
  };
  const saveSsoConfig = async () => {
    toast.promise(api('/v1/org/sso', { method: 'POST', body: JSON.stringify(ssoConfig) }), {
      loading: 'Pushing SSO Policy to Global Registry...',
      success: 'Policy Distributed Successfully',
      error: 'Failed to update organization policy'
    });
  };
  return (
    <AppLayout container>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">Enterprise Control Plane</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg font-medium">Orchestrate organization identity and security policies.</p>
          </div>
          <Badge variant="outline" className="h-7 sm:h-8 px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-2 bg-indigo-50/50 dark:bg-indigo-950/40 w-fit">
            Org: OmniSign_Enterprise
          </Badge>
        </div>
        <Tabs defaultValue="auth" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto sm:inline-flex gap-1">
            <TabsTrigger value="identity" className="px-2 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">Identity</TabsTrigger>
            <TabsTrigger value="auth" className="px-2 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">SSO</TabsTrigger>
            <TabsTrigger value="roles" className="px-2 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest">RBAC</TabsTrigger>
            <TabsTrigger value="deployment" className="px-2 sm:px-6 py-2 rounded-lg font-bold text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 justify-center">
              <Rocket className="size-3 text-indigo-500" />
              <span>Deploy & Demo</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="auth" className="space-y-4 sm:space-y-6 outline-none">
            <Card className="shadow-soft border-slate-200 dark:border-white/10">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
                <div>
                  <CardTitle className="text-lg sm:text-xl uppercase font-black">SSO (SAML 2.0 / OIDC)</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Enterprise identity provider orchestration for fleet managers.</CardDescription>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Federated Auth</span>
                  <Switch checked={ssoConfig.enabled} onCheckedChange={(v) => updateSso({ enabled: v })} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 pt-0">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Protocol Provider</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['okta', 'azure', 'google', 'oidc'].map(provider => (
                        <Button
                          key={provider}
                          variant={ssoConfig.provider === provider ? 'default' : 'outline'}
                          className="font-black text-[10px] h-10 sm:h-11 uppercase tracking-widest rounded-xl"
                          onClick={() => updateSso({ provider: provider as any })}
                        >
                          {provider}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Discovery Endpoint / Metadata URL</Label>
                    <Input placeholder="https://idp.enterprise.com/.well-known/openid-configuration" className="h-10 sm:h-11 rounded-xl text-xs" />
                    <p className="text-[10px] text-muted-foreground italic">OmniSign will periodically poll this for signing key rotations.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-end border-t pt-6 sm:pt-8">
                  <Button variant="outline" className="h-10 sm:h-11 rounded-xl font-black text-[10px] uppercase tracking-widest w-full sm:w-auto" onClick={handleTestSso} disabled={isTesting}>
                    {isTesting ? <RefreshCw className="animate-spin mr-2 size-3" /> : <Activity className="mr-2 size-3" />}
                    Test Connectivity
                  </Button>
                  <Button className="bg-indigo-600 h-10 sm:h-11 px-6 sm:px-10 rounded-xl shadow-primary uppercase tracking-widest text-[10px] font-black w-full sm:w-auto" onClick={saveSsoConfig}>
                    Save Policy
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              <Card className="md:col-span-1 border-dashed bg-slate-50/50 dark:bg-slate-900/40">
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <CardTitle className="text-xs font-black uppercase">Metadata Export</CardTitle>
                  <CardDescription className="text-[10px]">Provide this to your IdP administrator.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2">
                  <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase tracking-widest">
                    <Download className="mr-2 size-3" /> Download XML Metadata
                  </Button>
                </CardContent>
              </Card>
              <Card className="md:col-span-2 border-slate-200 dark:border-white/10">
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <CardTitle className="text-xs font-black uppercase">OIDC Client Claims</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 sm:p-6 pt-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between text-[10px] font-mono p-2.5 sm:p-3 bg-muted rounded-lg gap-1">
                    <span className="opacity-50 text-[9px]">REDIRECT_URI</span>
                    <span className="font-bold break-all">https://omnisign.io/auth/callback</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between text-[10px] font-mono p-2.5 sm:p-3 bg-muted rounded-lg gap-1">
                    <span className="opacity-50 text-[9px]">SCOPES</span>
                    <span className="font-bold">openid profile email groups</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="identity" className="space-y-4 sm:space-y-6 outline-none">
             <Card className="shadow-soft border-slate-200 dark:border-white/10">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-base sm:text-lg uppercase font-black">Cryptographic Root</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">Primary manifest signing credentials for the fleet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Root Public Key (ED25519)</Label>
                  <div className="p-3 sm:p-4 bg-slate-950 text-emerald-500 font-mono text-[9px] sm:text-[10px] rounded-xl border border-white/10 break-all leading-relaxed shadow-inner">
                    {ROOT_PUB_KEY}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="roles" className="space-y-4 sm:space-y-6 outline-none">
             <Card className="shadow-soft border-slate-200 dark:border-white/10">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-500" />
                    <CardTitle className="text-base sm:text-lg uppercase font-black">Role-Based Access Control</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">Active roles and permissions enforced at API ingress.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
                  {[
                    { role: "ADMINISTRATOR", perms: "Full cluster management, key rotation, SSO configuration" },
                    { role: "FLEET_MANAGER", perms: "Device orchestration, manifest publishing, watchdog control" },
                    { role: "EDGE_NODE", perms: "P2P cache exchange, telemetry submission, PoP logging" }
                  ].map((r, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-muted/20 gap-1 sm:gap-4">
                      <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{r.role}</span>
                      <span className="text-[11px] text-muted-foreground">{r.perms}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
          </TabsContent>
          <TabsContent value="deployment" className="space-y-4 sm:space-y-6 outline-none">
            <Card className="shadow-soft border-slate-200 dark:border-white/10">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-indigo-500" />
                      <CardTitle className="text-base sm:text-lg uppercase font-black">GitHub Pages & Demo Architecture</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Standalone client-side execution and automated GitHub Actions publishing configuration.
                    </CardDescription>
                  </div>
                  <Badge variant={activeDemo ? "secondary" : "outline"} className="w-fit text-[10px] font-mono font-bold tracking-wider">
                    {activeDemo ? "STATUS: IN-BROWSER DEMO MODE" : "STATUS: LIVE CLOUD API"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">In-Browser Demo Sandbox</span>
                      <Switch checked={demoForced} onCheckedChange={toggleForceDemo} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Emulates the full Express backend using browser Web Crypto (Ed25519 & SHA-256) and persistent LocalStorage. When active or when hosted on GitHub Pages (github.io), all views, the screen simulator, and cryptographic pairing operate 100% client-side.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-foreground">GitHub Actions Pipeline</span>
                      <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/30 bg-emerald-50/20">READY</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Configured at <code className="font-mono text-[11px] text-foreground bg-muted px-1 py-0.5 rounded">.github/workflows/deploy-pages.yml</code>. Automatically lints, runs Vitest tests, builds the Vite static bundle with relative base paths, and deploys to GitHub Pages on every push to <code className="font-mono text-[11px] text-foreground bg-muted px-1 py-0.5 rounded">main</code>.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">How to Enable GitHub Pages in Your Repo</span>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Push your code to your GitHub repository.</li>
                    <li>Go to repository <strong>Settings</strong> &rarr; <strong>Pages</strong>.</li>
                    <li>Under <strong>Source</strong>, select <strong>GitHub Actions</strong>.</li>
                    <li>The included workflow will automatically build and publish your interactive demo link!</li>
                  </ol>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button variant="outline" size="sm" onClick={handleResetDemoData} className="text-xs gap-1.5">
                    <RotateCcw className="size-3.5" />
                    Reset Demo State
                  </Button>
                  <span className="text-[11px] text-muted-foreground">
                    SPA deep routing supported via <code className="font-mono">404.html</code>
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}