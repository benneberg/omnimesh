import { create } from 'zustand';
import type { User, SsoConfig } from '@shared/types';
interface AuthState {
  user: User | null;
  ssoConfig: SsoConfig;
  setUser: (user: User | null) => void;
  updateSso: (config: Partial<SsoConfig>) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 'u-root-001',
    name: 'Enterprise Admin',
    role: 'admin',
    authMethod: 'local',
    email: 'admin@omnisign.io',
    orgId: 'org-default'
  },
  ssoConfig: {
    enabled: false,
    provider: 'oidc',
    entryPoint: '',
    issuer: '',
  },
  setUser: (user) => set({ user }),
  updateSso: (config) => set((state) => ({ 
    ssoConfig: { ...state.ssoConfig, ...config } 
  })),
  logout: () => set({ user: null }),
}));