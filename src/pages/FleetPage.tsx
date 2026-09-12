import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Monitor, RefreshCcw, ShieldCheck, ExternalLink, ClipboardCheck, Cpu, Database, HardDrive, Copy, ShieldAlert, Zap, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import type { Device } from '@shared/types';
import { formatDistanceToNow, format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
export function FleetPage() {
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const user = useAuthStore(s => s.user);
  const isFleetManager = user?.role === 'admin' || user?.role === 'fleet_manager';
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<{ items: Device[] }>('/v1/devices'),
    refetchInterval: 5000,
  });
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Identity hash copied to clipboard");
  };
  const devices = devicesData?.items ?? [];
  return (
    <AppLayout container>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Fleet Monitor</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg font-medium">Orchestrating {devices.length} verified edge nodes.</p>
          </div>
          <div className="flex gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto h-10 sm:h-12 px-4 sm:px-6 rounded-xl border-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors font-bold text-xs sm:text-sm" 
                    onClick={() => isFleetManager && refetch()} 
                    disabled={isLoading || !isFleetManager}
                  >
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Sync Fleet
                  </Button>
                  {!isFleetManager && <Lock className="absolute -top-1 -right-1 size-4 text-rose-500 bg-background rounded-full border p-0.5" />}
                </div>
              </TooltipTrigger>
              {!isFleetManager && <TooltipContent>Fleet Manager permissions required</TooltipContent>}
            </Tooltip>
          </div>
        </div>

        {/* Mobile Device Cards (sm:hidden) */}
        <div className="block sm:hidden space-y-3">
          {devices.map((device) => {
            const efficiency = device.p2pMetrics?.totalFetches > 0
              ? Math.min(100, Math.round((device.p2pMetrics.meshHits / device.p2pMetrics.totalFetches) * 100))
              : 0;
            const isVerified = (device.popLogs?.length || 0) > 0;
            return (
              <div
                key={device.id}
                onClick={() => isFleetManager ? setViewingDevice(device) : toast.error("Insufficient Permissions")}
                className="p-4 rounded-2xl border bg-card hover:border-indigo-300 transition-all shadow-sm space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0">
                      <Monitor size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">{device.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase">NODE_{device.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <Badge variant={device.status === 'active' ? 'outline' : 'destructive'} className="text-[9px] font-black uppercase tracking-wider shrink-0 border-2">
                    {device.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-black tracking-tight">
                    <span className="text-muted-foreground uppercase">Mesh Efficiency</span>
                    <span className={efficiency > 50 ? 'text-indigo-600' : efficiency > 20 ? 'text-amber-600' : 'text-slate-400'}>{efficiency}%</span>
                  </div>
                  <Progress value={efficiency} className={`h-1.5 bg-slate-100 dark:bg-slate-800 ${efficiency > 50 ? '[&>div]:bg-indigo-500' : '[&>div]:bg-amber-500'}`} />
                </div>

                <div className="flex items-center justify-between border-t pt-2.5 text-[10px] text-muted-foreground font-mono">
                  <div className="flex items-center gap-1.5 font-sans font-bold uppercase tracking-tight">
                    <ClipboardCheck size={13} className={isVerified ? "text-emerald-500" : "text-slate-300"} />
                    <span className={isVerified ? "text-emerald-600" : ""}>{device.popLogs?.length || 0} LOGS</span>
                  </div>
                  <span className="font-bold">
                    {(device.lastHeartbeatAt || 0) > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }).toUpperCase() : 'OFFLINE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block rounded-2xl border bg-card overflow-hidden shadow-soft ring-1 ring-slate-100 dark:ring-white/5">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest py-4 text-foreground">Execution Node</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-foreground">Status</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-center text-foreground">Mesh Efficiency</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-foreground">Verification</TableHead>
                  <TableHead className="px-6 font-black uppercase text-[10px] tracking-widest text-right text-foreground">Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const efficiency = device.p2pMetrics?.totalFetches > 0
                    ? Math.min(100, Math.round((device.p2pMetrics.meshHits / device.p2pMetrics.totalFetches) * 100))
                    : 0;
                  const isVerified = (device.popLogs?.length || 0) > 0;
                  return (
                    <TableRow 
                      key={device.id} 
                      className="group cursor-pointer hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors" 
                      onClick={() => isFleetManager ? setViewingDevice(device) : toast.error("Insufficient Permissions")}
                    >
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><Monitor size={20} /></div>
                          <div>
                            <div className="font-black text-sm">{device.name}</div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">NODE_{device.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Badge variant={device.status === 'active' ? 'outline' : 'destructive'} className="text-[9px] font-black uppercase tracking-widest border-2">
                            {device.status}
                          </Badge>
                          {device.status === 'active' && <ShieldCheck className="size-4 text-emerald-500 drop-shadow-sm" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1.5 min-w-[140px] px-6">
                           <div className="flex justify-between w-full text-[9px] font-black tracking-tighter">
                             <span className="opacity-50 uppercase">Savings</span>
                             <span className={efficiency > 50 ? 'text-indigo-600' : efficiency > 20 ? 'text-amber-600' : 'text-slate-400'}>{efficiency}%</span>
                           </div>
                           <Progress value={efficiency} className={`h-1.5 bg-slate-100 dark:bg-slate-800 ${efficiency > 50 ? '[&>div]:bg-indigo-500' : '[&>div]:bg-amber-500'}`} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                          <ClipboardCheck size={14} className={isVerified ? "text-emerald-500" : "text-slate-300"} />
                          <span className={isVerified ? "text-emerald-600" : ""}>{device.popLogs?.length || 0} AUTH_LOGS</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right font-mono text-[10px] font-black text-slate-400">
                        {(device.lastHeartbeatAt || 0) > 0 ? formatDistanceToNow(device.lastHeartbeatAt, { addSuffix: true }).toUpperCase() : 'OFFLINE'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <Sheet open={!!viewingDevice} onOpenChange={(o) => !o && setViewingDevice(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-4 sm:p-6">
          {viewingDevice && (
            <div className="space-y-6 pt-4 sm:pt-6">
              <SheetHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl sm:rounded-2xl shadow-primary shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div className="min-w-0">
                      <SheetTitle className="text-xl sm:text-2xl font-black tracking-tighter truncate">{viewingDevice.name}</SheetTitle>
                      <SheetDescription className="text-[10px] font-black text-indigo-500 uppercase tracking-widest truncate">
                        NODE: {viewingDevice.id.slice(0, 16)}...
                      </SheetDescription>
                    </div>
                  </div>
                  <a href={`/simulator/${viewingDevice.id}`} target="_blank" rel="noreferrer" className="shrink-0">
                    <Button variant="outline" size="icon" className="rounded-xl border-2 hover:bg-indigo-50 transition-all h-9 w-9"><ExternalLink size={16} /></Button>
                  </a>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 py-2 sm:py-4">
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                  <div className={`p-2 rounded-lg shrink-0 ${viewingDevice.telemetry.escalationLevel === 'none' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <ShieldAlert size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Hardware Watchdog</span>
                    <span className="text-xs font-black uppercase truncate">{viewingDevice.telemetry.escalationLevel === 'none' ? 'STABLE' : viewingDevice.telemetry.escalationLevel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                    <Zap size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Resilience Mode</span>
                    <span className="text-xs font-black uppercase">ADAPTIVE_MESH</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-4 sm:pb-6 border-b border-dashed">
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 text-center">
                  <Cpu size={16} className="text-indigo-500 mb-1 sm:mb-2" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground tracking-tight">CPU Cores</span>
                  <span className="text-xs sm:text-sm font-black">{viewingDevice.telemetry.cpuCores || '8'}x</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 text-center">
                  <Database size={16} className="text-indigo-500 mb-1 sm:mb-2" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground tracking-tight">RAM Limit</span>
                  <span className="text-xs sm:text-sm font-black">{viewingDevice.telemetry.memoryLimit || '8192'}M</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 text-center">
                  <HardDrive size={16} className="text-indigo-500 mb-1 sm:mb-2" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground tracking-tight">Disk Peak</span>
                  <span className="text-xs sm:text-sm font-black">{viewingDevice.telemetry.diskUsage}%</span>
                </div>
              </div>
              <Tabs defaultValue="pop" className="w-full">
                <TabsList className="w-full grid grid-cols-2 mb-4 sm:mb-6 h-11 sm:h-12 rounded-xl bg-muted/50 p-1">
                  <TabsTrigger value="pop" className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest">Ad-Verification</TabsTrigger>
                  <TabsTrigger value="logs" className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest">System Trace</TabsTrigger>
                </TabsList>
                <TabsContent value="pop" className="space-y-4">
                   <div className="space-y-3 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                     {(viewingDevice.popLogs || []).map((log) => (
                       <div key={log.id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border bg-slate-50 dark:bg-slate-900/50 space-y-2 sm:space-y-3 group hover:border-indigo-200 transition-all">
                         <div className="flex justify-between items-center gap-2">
                           <div className="flex items-center gap-1.5 min-w-0">
                             <Badge variant="outline" className="text-[9px] font-mono bg-white dark:bg-slate-950 border-2 uppercase tracking-tighter truncate">HASH: {log.contentHash.slice(0, 10)}</Badge>
                             <Button
                               variant="ghost"
                               size="icon"
                               className="size-5 shrink-0"
                               onClick={() => copyToClipboard(log.contentHash)}
                             >
                               <Copy className="size-3" />
                             </Button>
                           </div>
                           <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground font-bold shrink-0">{format(log.timestamp, 'HH:mm:ss')}</span>
                         </div>
                         <div className="text-[9px] font-mono text-indigo-600/70 dark:text-indigo-400/70 break-all leading-tight border-t pt-2 mt-1 border-slate-200 dark:border-slate-800 italic">
                           SIG: {log.signature.slice(0, 48)}...
                         </div>
                       </div>
                     ))}
                   </div>
                </TabsContent>
                <TabsContent value="logs" className="space-y-4">
                   <div className="space-y-2 max-h-[350px] sm:max-h-[400px] overflow-y-auto custom-scrollbar">
                     {(viewingDevice.logs || []).map((log) => (
                       <div key={log.id} className="flex justify-between items-center text-[9px] sm:text-[10px] font-mono p-2.5 sm:p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 gap-2">
                         <span className={`font-black truncate ${log.level === 'error' ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                           [{log.level.toUpperCase()}] {log.event}
                         </span>
                         <span className="text-slate-400 font-bold shrink-0">{format(log.timestamp, 'HH:mm:ss')}</span>
                       </div>
                     ))}
                   </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}