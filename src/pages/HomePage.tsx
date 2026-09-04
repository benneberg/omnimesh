import React, { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldAlert, Activity, AlertTriangle, Terminal, Zap, Globe2, Shield, Loader2, BrainCircuit, TrendingUp } from 'lucide-react';
import { Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid, ReferenceArea } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { detectAnomalies, type AnomalyReport } from '@/lib/anomaly-engine';
import type { Device } from '@shared/types';
import { motion } from 'framer-motion';
export function HomePage() {
  const user = useAuthStore(s => s.user);
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
    refetchInterval: 5000,
  });
  const devices = useMemo(() => devicesData?.items ?? [], [devicesData?.items]);
  const anomalies = useMemo(() => {
    return devices.map(d => detectAnomalies(d)).filter(a => a.severity !== 'Nominal');
  }, [devices]);
  const activeCount = useMemo(() => devices.filter(d => d.status === 'active').length, [devices]);
  const watchdogAlerts = useMemo(() => devices.filter(d => d.telemetry?.escalationLevel !== 'none').length, [devices]);
  const offlineCount = useMemo(() => devices.filter(d => d.status === 'offline' || d.status === 'emergency_mode').length, [devices]);
  const fleetHealth = useMemo(() => {
    if (devices.length === 0) return 0;
    const baseHealth = (activeCount / devices.length) * 100;
    const anomalyPenalty = anomalies.length * 3;
    return Math.max(0, Math.round(baseHealth - (watchdogAlerts * 5) - (offlineCount * 10) - anomalyPenalty));
  }, [devices, activeCount, watchdogAlerts, offlineCount, anomalies]);
  const fleetMetrics = useMemo(() => {
    if (devices.length === 0) return [];
    const buckets: Record<number, { cpu: number, mem: number, count: number }> = {};
    devices.forEach(d => {
      const history = d.metricsHistory;
      if (!history?.timestamps) return;
      history.timestamps.forEach((t, i) => {
        const minute = Math.floor(t / 60000) * 60000;
        if (!buckets[minute]) buckets[minute] = { cpu: 0, mem: 0, count: 0 };
        buckets[minute].cpu += history.cpu[i] || 0;
        buckets[minute].mem += history.mem[i] || 0;
        buckets[minute].count += 1;
      });
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([t, val]) => ({
        time: new Date(Number(t)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Number(t),
        cpu: val.count > 0 ? Math.round(val.cpu / val.count) : 0,
        mem: val.count > 0 ? Math.round(val.mem / val.count) : 0
      })).slice(-20);
  }, [devices]);
  return (
    <AppLayout container contentClassName="relative min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(#4338ca_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.04] pointer-events-none" />
      <div className="space-y-10 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-2">
              <Zap className="h-4 w-4 animate-pulse" /> Enterprise Command Center
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-none bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              {user?.name.split(' ')[0]} Fleet
            </h1>
          </div>
          <div className="flex gap-3">
             <Badge className="bg-indigo-600 text-white border-none px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-glow">
               ORCHESTRATION: NOMINAL
             </Badge>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <StatCard title="Active Nodes" value={activeCount} icon={CheckCircle2} color="emerald" />
          <StatCard title="Anomalies Detected" value={anomalies.length} icon={BrainCircuit} color="amber" sub="Predictive Engine Active" />
          <StatCard title="Watchdog Recovery" value={watchdogAlerts} icon={ShieldAlert} color="rose" />
          <StatCard title="Fleet Integrity" value={`${fleetHealth}%`} icon={Shield} color="indigo" />
        </div>
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          <Card className="lg:col-span-8 shadow-soft border-0 ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm min-h-[500px]">
            <CardHeader className="border-b px-8 py-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Global Telemetry Stream</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-[400px] pt-10 px-8">
              {isLoading ? <div className="center h-full"><Loader2 className="animate-spin text-indigo-500" /></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={fleetMetrics}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4338CA" stopOpacity={0.15}/><stop offset="95%" stopColor="#4338CA" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', background: 'hsl(var(--background))' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#4338CA" fill="url(#colorCpu)" strokeWidth={3} />
                    {anomalies.length > 0 && <ReferenceArea x1={fleetMetrics[fleetMetrics.length-5]?.time} x2={fleetMetrics[fleetMetrics.length-1]?.time} fill="rgba(245, 158, 11, 0.1)" label={{ position: 'top', value: 'Anomalous Drift', fontSize: 10, fill: '#f59e0b' }} />}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-soft border-0 ring-1 ring-slate-200/50 dark:ring-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <CardHeader className="border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Predictive Maintenance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[350px] overflow-y-auto">
                {anomalies.length === 0 ? (
                  <div className="p-10 text-center space-y-2 opacity-50">
                    <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No anomalies detected</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {anomalies.map((a, idx) => (
                      <div key={idx} className="p-4 hover:bg-amber-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className="bg-amber-500 text-white border-none text-[8px]">{a.type}</Badge>
                          <span className="text-[9px] font-black text-muted-foreground">{(a.probability * 100).toFixed(0)}% PROB</span>
                        </div>
                        <p className="text-[11px] font-medium leading-tight">{a.description}</p>
                        <p className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-widest">NODE: {a.deviceId}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <Card className="group relative overflow-hidden border-0 shadow-soft ring-1 ring-slate-200/50 dark:ring-white/10 backdrop-blur-xl bg-white/40 dark:bg-slate-900/40">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color === 'emerald' ? 'text-emerald-500' : 'text-indigo-500'} opacity-50`} />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-black tabular-nums tracking-tighter">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tight">{sub || "Verified Identity"}</p>
      </CardContent>
    </Card>
  );
}