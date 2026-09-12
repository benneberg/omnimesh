import { describe, it, expect } from "vitest";
import { detectAnomalies } from "@/lib/anomaly-engine";
import type { Device } from "@shared/types";

describe("Enterprise Anomaly & Predictive Maintenance Engine", () => {
  const baseDevice: Device = {
    id: "dev-test-01",
    orgId: "org-1",
    name: "Test Node",
    status: "active",
    platform: "webos",
    appVersion: "3.6.0-PROD",
    lastHeartbeatAt: Date.now(),
    pairingExpiresAt: 0,
    popLogs: [],
    logs: [],
    p2pSharingEnabled: true,
    p2pMetrics: { meshHits: 10, totalFetches: 20 },
    metricsHistory: {
      cpu: [12, 14, 15, 12, 13, 11, 14],
      mem: [40, 41, 40, 42, 41, 40, 41],
      timestamps: [1, 2, 3, 4, 5, 6, 7],
    },
    telemetry: {
      cpuUsage: 14,
      memUsage: 41,
      diskUsage: 25,
      uptimeSeconds: 7200,
      playbackErrors: [],
      escalationLevel: "none",
    },
  };

  it("returns Nominal status for steady-state device", () => {
    const report = detectAnomalies(baseDevice);
    expect(report.severity).toBe("Nominal");
    expect(report.type).toBe("None");
    expect(report.probability).toBe(0);
    expect(report.description).toContain("nominal");
  });

  it("detects gradual memory leak drift and reports Warning", () => {
    const leakingDevice: Device = {
      ...baseDevice,
      metricsHistory: {
        ...baseDevice.metricsHistory,
        mem: [40, 43, 46, 50, 54, 58, 62], // +22% steady growth without drops
      },
    };

    const report = detectAnomalies(leakingDevice);
    expect(report.severity).toBe("Warning");
    expect(report.type).toBe("Memory Leak");
    expect(report.probability).toBeGreaterThan(0.4);
    expect(report.description).toContain("Memory usage increased by 22%");
  });

  it("escalates severe memory leak drift (>30%) to Critical", () => {
    const severeLeakDevice: Device = {
      ...baseDevice,
      metricsHistory: {
        ...baseDevice.metricsHistory,
        mem: [35, 40, 46, 53, 61, 70, 78], // +43% severe leak
      },
    };

    const report = detectAnomalies(severeLeakDevice);
    expect(report.severity).toBe("Critical");
    expect(report.type).toBe("Memory Leak");
    expect(report.probability).toBeGreaterThan(0.8);
  });

  it("detects CPU pinned saturation (>90% for 3 cycles) as Critical", () => {
    const saturatedDevice: Device = {
      ...baseDevice,
      metricsHistory: {
        ...baseDevice.metricsHistory,
        cpu: [20, 30, 40, 85, 94, 96, 98], // Last 3 cycles > 90%
      },
    };

    const report = detectAnomalies(saturatedDevice);
    expect(report.severity).toBe("Critical");
    expect(report.type).toBe("CPU Saturation");
    expect(report.description).toContain("Watchdog recovery imminent");
  });

  it("detects elevated playback error spikes as Network Jitter Warning", () => {
    const jitterDevice: Device = {
      ...baseDevice,
      telemetry: {
        ...baseDevice.telemetry,
        playbackErrors: [
          "ERR_DECODE_01",
          "ERR_BUFFER_UNDERRUN",
          "ERR_TIMEOUT",
          "ERR_DECODE_02",
          "ERR_SOCKET_RESET",
          "ERR_HTTP_504",
        ],
      },
    };

    const report = detectAnomalies(jitterDevice);
    expect(report.severity).toBe("Warning");
    expect(report.type).toBe("Network Jitter");
    expect(report.description).toContain("Elevated playback error rate");
  });

  it("handles devices with insufficient sample data gracefully", () => {
    const sparseDevice: Device = {
      ...baseDevice,
      metricsHistory: {
        cpu: [10, 20],
        mem: [40, 42],
        timestamps: [1, 2],
      },
    };

    const report = detectAnomalies(sparseDevice);
    expect(report.severity).toBe("Nominal");
    expect(report.description).toBe("Insufficient data");
  });
});
