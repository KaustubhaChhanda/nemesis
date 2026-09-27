import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { api } from '@/api/client';

import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SourcesPage from '@/pages/SourcesPage';
import GraphPage from '@/pages/GraphPage';
import TimelinePage from '@/pages/TimelinePage';
import InvestigationsPage from '@/pages/InvestigationsPage';
import EvidencePage from '@/pages/EvidencePage';
import InfrastructurePage from '@/pages/InfrastructurePage';
import PersonasPage from '@/pages/PersonasPage';
import DiscoverPage from '@/pages/DiscoverPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!api.isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="investigations" element={<InvestigationsPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="infrastructure" element={<InfrastructurePage />} />
            <Route path="personas" element={<PersonasPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
