/*
Wraps children in a sidebar layout. Don't use this if you don't need a sidebar
*/
import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/auth-store";
import { isDemoMode } from "@/lib/api-client";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AppLayoutProps = {
  children: React.ReactNode;
  container?: boolean;
  className?: string;
  contentClassName?: string;
};

export function AppLayout({ children, container = false, className, contentClassName }: AppLayoutProps): JSX.Element {
  const user = useAuthStore(s => s.user);
  const demoActive = isDemoMode();

  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset className={cn("min-w-0 w-full max-w-full overflow-x-hidden flex-1", className)}>
        <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b bg-background/95 px-3 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <SidebarTrigger className="h-9 w-9 shrink-0 text-foreground" />
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="bg-gradient-to-r from-indigo-500 to-indigo-700 bg-clip-text text-transparent font-black tracking-tight text-sm sm:text-base">
                OmniScreenMesh
              </span>
              <span className="hidden sm:inline-flex text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                v1.6-prod
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {demoActive && (
              <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="size-2.5" />
                <span className="hidden xs:inline">Interactive</span> Demo
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30">
              {user?.role ? user.role.split('_')[0] : 'NODE'}
            </Badge>
          </div>
        </header>
        {container ? (
          <div className={cn("max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-10 min-w-0", contentClassName)}>
            {children}
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-x-hidden flex-1">
            {children}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
