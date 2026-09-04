/**
 * Advanced Native Bridge utility for ScreenMesh Shell (Electron/Native).
 * Facilitates deep system integration for enterprise hardware deployments.
 */
export class NativeBridge {
  private static handlers: Map<string, (cmd: string, payload: any) => void> = new Map();
  static isNative(): boolean {
    return !!(window as any).electron || !!(window as any).SignageNative;
  }
  static async getHardwareId(): Promise<string> {
    if (this.isNative()) {
      return (window as any).SignageNative?.getHardwareId() || "NATIVE_HW_UNKNOWN";
    }
    return "BROWSER_SIM_" + Math.random().toString(36).substring(7).toUpperCase();
  }
  static async setPowerState(state: 'ON' | 'OFF' | 'STANDBY'): Promise<boolean> {
    console.warn(`[NATIVE] System Power Transition: ${state}`);
    if (this.isNative()) {
      return (window as any).SignageNative?.setPower(state);
    }
    return true;
  }
  static watchdogPulse(): void {
    if (this.isNative()) {
      (window as any).SignageNative?.pulse();
    } else {
      // Simulator loop
      (window as any)._last_wdt_ping = Date.now();
    }
  }
  static async rebootDevice(): Promise<void> {
    console.error("[NATIVE] CRITICAL: Remote reboot issued.");
    if (this.isNative()) {
      (window as any).SignageNative?.reboot();
    } else {
      window.location.reload();
    }
  }
  /**
   * Simulates/Handles remote shell commands from the Control Plane
   */
  static onSystemCommand(callback: (cmd: string, payload: any) => void) {
    this.handlers.set('cmd', callback);
    // In a real native environment, this would be an IPC listener
    if (!this.isNative()) {
      (window as any).simulateNativeCommand = (cmd: string, p: any) => callback(cmd, p);
    }
  }
  static async getInternalTelemetry(): Promise<{ temp: number; fanSpeed: number }> {
    if (this.isNative()) {
      return (window as any).SignageNative?.getThermalData();
    }
    return { temp: 42 + Math.random() * 10, fanSpeed: 2400 + Math.random() * 200 };
  }
}