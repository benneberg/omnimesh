import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { FleetPage } from '@/pages/FleetPage'
import { PlaylistsPage } from '@/pages/PlaylistsPage'
import { SimulatorPage } from '@/pages/SimulatorPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DocsPage } from '@/pages/DocsPage'
import { ProvisionPage } from '@/pages/ProvisionPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const basename = import.meta.env.BASE_URL && !import.meta.env.BASE_URL.startsWith('.')
  ? import.meta.env.BASE_URL
  : undefined;

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/fleet",
    element: <FleetPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/playlists",
    element: <PlaylistsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/docs",
    element: <DocsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/provision",
    element: <ProvisionPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/simulator/:id",
    element: <SimulatorPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
], { basename });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)