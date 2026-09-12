import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, saveAuth } from '@/lib/api-client';
import { generateDeviceKeypair, exportKey, signData } from '@/lib/crypto-utils';
import { NativeBridge } from '@/lib/native-bridge';
import { detectAnomalies } from '@/lib/anomaly-engine';
import type { Manifest, Device, DeviceInitResponse, PoPLog } from '@shared/types';
import { ShieldCheck, Loader2, Lock, Zap, Cpu, Fan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
const DB_NAME = "ScreenMeshDB";
const STORE_NAME = "Persistence";
export function SimulatorPage() {
  const { id } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deviceState, setDeviceState] = useState<Device | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [keys, setKeys] = useState<{ pub: string, priv: CryptoKey } | null>(null);
  const [resilienceTier] = useState<'live' | 'cached' | 'mesh'>('live');
  const [pairingData, setPairingData] = useState<DeviceInitResponse | null>(null);
  const [wdtActive, setWdtActive] = useState(false);
  const [thermal, setThermal] = useState({ temp: 38, fanSpeed: 2100 });
  const isNative = NativeBridge.isNative();
  const getStored = async (key: string) => {
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => {
        const tx = req.result.transaction(STORE_NAME, "readonly");
        const get = tx.objectStore(STORE_NAME).get(key);
        get.onsuccess = () => resolve(get.result);
      };
    });
  };
  const setStored = async (key: string, val: any) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(val, key);
    };
  };
  // Main Boot Sequence
  useEffect(() => {
    const boot = async () => {
      try {
        let pub = await getStored("publicKey") as string;
        let priv = await getStored("privateKey") as CryptoKey;
        if (!pub) {
          const kp = await generateDeviceKeypair();
          pub = await exportKey(kp.publicKey);
          priv = kp.privateKey;
          await setStored("publicKey", pub);
          await setStored("privateKey", priv);
        }
        if (id) {
          setKeys({ pub, priv });
          const dev = await api<Device>(`/v1/devices/${id}`).catch(() => null);
          if (dev && dev.status === 'active') {
            setDeviceState(dev);
            if (dev.accessToken) saveAuth(id, dev.accessToken);
          } else {
            const init = await api<DeviceInitResponse>(`/v1/devices/init`, {
              method: 'POST',
              body: JSON.stringify({ id, platform: isNative ? 'Native' : 'Browser', appVersion: '3.6.0-PROD', publicKey: pub })
            });
            setPairingData(init);
          }
        }
      } catch (err) {
        console.error("[BOOT_ERROR]", err);
      } finally {
        setTimeout(() => setIsBooting(false), 1200);
      }
    };
    boot();
  }, [id, isNative]);
  // Activation Polling Loop (Hands-off provisioning)
  useEffect(() => {
    if (deviceState?.status === 'active' || !id) return;
    const pollActivation = setInterval(async () => {
      try {
        const dev = await api<Device>(`/v1/devices/${id}`);
        if (dev.status === 'active') {
          setDeviceState(dev);
          if (dev.accessToken) saveAuth(id, dev.accessToken);
          toast.success("Identity Verified", { description: "Node activated by Control Plane" });
        }
      } catch (e) {
        // Silently retry activation check
      }
    }, 5000);
    return () => clearInterval(pollActivation);
  }, [id, deviceState?.status]);
  // System Command Listener
  useEffect(() => {
    NativeBridge.onSystemCommand((cmd, payload) => {
      console.log(`[SYSTEM_CMD] Executing: ${cmd}`, payload);
      if (cmd === 'REBOOT') NativeBridge.rebootDevice();
      if (cmd === 'PURGE_CACHE') window.location.reload();
    });
  }, []);
  // Self-Healing & Anomaly Integration
  useEffect(() => {
    if (!deviceState) return;
    const interval = setInterval(() => {
      const report = detectAnomalies(deviceState);
      if (report.severity === 'Critical') {
        toast.error("Anomalous Execution Detected", { description: "Initiating Self-Healing Routine..." });
        window.location.reload();
      }
      NativeBridge.watchdogPulse();
      setWdtActive(true);
      setTimeout(() => setWdtActive(false), 200);
      NativeBridge.getInternalTelemetry().then(setThermal);
    }, 10000);
    return () => clearInterval(interval);
  }, [deviceState]);
  const { data: manifest } = useQuery({
    queryKey: ['simulator-playlist', id],
    queryFn: () => api<Manifest>(`/v1/devices/${id}/playlist`),
    enabled: deviceState?.status === 'active',
    refetchInterval: 30000,
  });
  const recordPoP = useCallback(async (item: any) => {
    if (!keys || !id || !item) return;
    try {
      const timestamp = Date.now();
      const message = `${item.id}:${item.integrity}:${timestamp}`;
      const signature = await signData(keys.priv, message);
      const log: PoPLog = {
        id: crypto.randomUUID(), deviceId: id, playlistItemId: item.id, contentHash: item.integrity, timestamp, durationMs: item.durationMs, signature
      };
      await api(`/v1/devices/${id}/pop`, { method: 'POST', body: JSON.stringify(log) });
    } catch (e) {
      console.warn("[PoP_ERROR] Emission failed:", e);
    }
  }, [id, keys]);
  useEffect(() => {
    if (!manifest?.playlist?.items?.length) return;
    const item = manifest.playlist.items[currentIndex];
    if (!item) return;
    const timer = setTimeout(() => {
      recordPoP(item);
      setCurrentIndex(prev => (prev + 1) % manifest.playlist.items.length);
    }, item.durationMs || 10000);
    return () => clearTimeout(timer);
  }, [currentIndex, manifest, recordPoP]);
  if (isBooting) return <div className="h-screen w-screen bg-black flex flex-col center text-white font-mono"><Loader2 className="animate-spin text-indigo-500 mb-4" /><span>SYSTEM_INIT_3.6...</span></div>;
  if (pairingData && (!deviceState || deviceState.status !== 'active')) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full p-10 bg-white rounded-[2.5rem] shadow-2xl text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-3xl flex center shadow-glow"><Lock className="text-white size-10" /></div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 uppercase">Provisioning</h2>
            <p className="text-sm text-slate-500 font-bold">NODE: {id?.slice(0, 12)}</p>
          </div>
          <div className="py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-indigo-100 text-6xl font-black text-indigo-600 tracking-[0.2em]">{pairingData.pairingCode}</div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Awaiting Orchestration Handshake...</p>
        </motion.div>
      </div>
    );
  }
  const activeItem = manifest?.playlist.items[currentIndex];
  return (
    <div className={`w-screen h-screen ${isNative ? 'bg-[#050505]' : 'bg-black'} relative overflow-hidden`}>
      <AnimatePresence mode="wait">
        {activeItem ? (
          <motion.div key={activeItem.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0">
            {activeItem.type === 'image' && <img src={activeItem.url} className="w-full h-full object-cover" alt="" />}
            {activeItem.type === 'video' && <video src={activeItem.url} autoPlay muted loop className="w-full h-full object-cover" />}
            {activeItem.type === 'html' && <div className="w-full h-full bg-white text-black p-10" dangerouslySetInnerHTML={{ __html: activeItem.htmlContent || '' }} />}
          </motion.div>
        ) : (
          <div className="center h-full text-white/20 uppercase tracking-[0.5em] font-mono"><Loader2 className="animate-spin mr-3" /> Syncing Manifest...</div>
        )}
      </AnimatePresence>
      <div className="absolute top-8 left-8 flex flex-col gap-3 z-50">
        <div className="flex gap-3">
          <Badge className={`h-9 px-5 rounded-full border-none font-black tracking-widest text-[10px] uppercase shadow-lg ${resilienceTier === 'mesh' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
            RESILIENCE: {resilienceTier.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="h-9 px-5 rounded-full bg-black/80 text-white border-white/20 text-[10px] flex items-center gap-2 font-black tracking-widest">
            <Cpu size={14} className={isNative ? "text-indigo-400" : "text-amber-400"} />
            {isNative ? 'NATIVE_HW' : 'SIMULATOR_V3'}
          </Badge>
        </div>
      </div>
      <div className="absolute bottom-10 right-10 p-8 bg-black/90 backdrop-blur-2xl border border-white/10 text-white font-mono text-[10px] rounded-[2rem] w-[340px] shadow-2xl">
        <div className="flex justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${wdtActive ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-white/20'} transition-all`} />
            <span className="text-indigo-400 font-black tracking-widest uppercase">Hardware Watchdog</span>
          </div>
          <span className="opacity-50 font-bold">REV_{manifest?.playlist.version || '0'}</span>
        </div>
        <div className="space-y-3 uppercase font-bold tracking-tight">
          <div className="flex justify-between items-center"><span>Temperature</span><span className={thermal.temp > 50 ? 'text-rose-500' : 'text-emerald-500'}>{thermal.temp.toFixed(1)}°C</span></div>
          <div className="flex justify-between items-center"><span>Fan Speed</span><span className="text-indigo-400 flex items-center gap-1"><Fan size={10} className="animate-spin" /> {thermal.fanSpeed.toFixed(0)} RPM</span></div>
          <div className="flex justify-between items-center"><span>Integrity</span><span className="text-emerald-500 flex items-center gap-1"><ShieldCheck size={12}/> Verified</span></div>
          <div className="flex justify-between items-center"><span>Identity</span><span className="truncate w-32 text-right opacity-60 font-mono">NODE_{id?.slice(0, 12)}</span></div>
        </div>
        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-indigo-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: (activeItem?.durationMs || 10000) / 1000, ease: "linear" }} key={currentIndex} />
          </div>
        </div>
      </div>
    </div>
  );
}