import type { Device } from '@shared/types';
export type AnomalySeverity = 'Nominal' | 'Warning' | 'Critical';
export interface AnomalyReport {
  deviceId: string;
  severity: AnomalySeverity;
  type: 'None' | 'Memory Leak' | 'CPU Saturation' | 'Network Jitter' | 'Thermal Throttling';
  probability: number;
  description: string;
}
/**
 * Enterprise Predictive Maintenance Engine
 * Processes telemetry history to detect operational drift before failure occurs.
 */
export function detectAnomalies(device: Device): AnomalyReport {
  const { metricsHistory, telemetry } = device;
  if (!metricsHistory || !metricsHistory.mem || metricsHistory.mem.length < 5) {
    return { deviceId: device.id, severity: 'Nominal', type: 'None', probability: 0, description: 'Insufficient data' };
  }
  const mem = metricsHistory.mem;
  const cpu = metricsHistory.cpu;
  const samples = mem.length;
  // 1. Detect Memory Leak (Linear growth detection)
  let isGrowing = true;
  for (let i = 1; i < samples; i++) {
    if (mem[i] < mem[i - 1] - 2) { // Allow for 2% noise
      isGrowing = false;
      break;
    }
  }
  const memDelta = mem[samples - 1] - mem[0];
  if (isGrowing && memDelta > 15) {
    return {
      deviceId: device.id,
      severity: memDelta > 30 ? 'Critical' : 'Warning',
      type: 'Memory Leak',
      probability: Math.min(0.95, (memDelta / 50)),
      description: `Predictive: Memory usage increased by ${memDelta}% over ${samples} cycles with no collection.`
    };
  }
  // 2. Detect CPU Saturation / Thermal Throttling
  const avgCpu = cpu.reduce((a, b) => a + b, 0) / samples;
  const recentCpu = cpu.slice(-3);
  const isPinned = recentCpu.every(v => v > 90);
  if (isPinned) {
    return {
      deviceId: device.id,
      severity: 'Critical',
      type: 'CPU Saturation',
      probability: 0.88,
      description: 'Execution Engine pinned at >90% CPU. Watchdog recovery imminent.'
    };
  }
  // 3. Playback Error Spikes
  if (telemetry.playbackErrors && telemetry.playbackErrors.length > 5) {
    return {
      deviceId: device.id,
      severity: 'Warning',
      type: 'Network Jitter',
      probability: 0.75,
      description: 'Elevated playback error rate detected. Potential CDN or local network congestion.'
    };
  }
  return {
    deviceId: device.id,
    severity: 'Nominal',
    type: 'None',
    probability: 0,
    description: 'System operating within nominal parameters.'
  };
}