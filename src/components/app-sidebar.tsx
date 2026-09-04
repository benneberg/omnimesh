import React from "react";
import { LayoutDashboard, Monitor, PlayCircle, Settings, ExternalLink, ShieldCheck, Activity, Users, Lock, ChevronRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/auth-store";
export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const isAdmin = user?.role === 'admin';
  const isFleetManager = user?.role === 'admin' || user?.role === 'fleet_manager';
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-glow ring-2 ring-indigo-500/20">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black leading-none tracking-tighter uppercase">OmniSign</span>
            <span className="text-[9px] font-black text-indigo-500 mt-1 uppercase tracking-widest flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> CONTROL_PLANE v1.5
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 opacity-50">Navigation</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/"} className="h-10">
                <Link to="/"><LayoutDashboard className="size-4" /> <span className="font-bold">Command Center</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isFleetManager && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/fleet"} className="h-10">
                  <Link to="/fleet"><Monitor className="size-4" /> <span className="font-bold">Real-Time Monitor</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/playlists"} className="h-10">
                <Link to="/playlists"><PlayCircle className="size-4" /> <span className="font-bold">Manifest Editor</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 opacity-50">Governance</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/docs'} className="h-10">
                    <Link to='/docs'><Lock className="size-4" /> <span className="font-bold">Security Reference</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/settings"} className="h-10">
                    <Link to="/settings"><Settings className="size-4" /> <span className="font-bold">System Policies</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-4 space-y-4">
          {/* Role Switcher for Dev Mode */}
          <div className="p-3 bg-muted/50 rounded-xl border border-dashed">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
              <Users className="size-2" /> Persona Context
            </p>
            <div className="flex gap-1">
              {['admin', 'content_author'].map(role => (
                <button
                  key={role}
                  onClick={() => setUser({ ...user!, role: role as any })}
                  className={`flex-1 py-1 rounded text-[8px] font-black uppercase transition-all ${user?.role === role ? 'bg-indigo-600 text-white' : 'bg-white/50 text-muted-foreground hover:bg-white'}`}
                >
                  {role.split('_')[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-indigo-500/5 p-4 border border-indigo-500/10 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="size-3 text-indigo-500" />
                <p className="text-[10px] font-black uppercase tracking-widest">Session Identity</p>
              </div>
              <p className="text-[9px] text-muted-foreground font-bold leading-tight">
                {user?.name}<br />
                <span className="text-indigo-500 uppercase">{user?.role}</span>
              </p>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}