import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

// Layout & Shell components
import AppShell from '@/components/layout/AppShell';

// Auth Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';

// Core Dashboard selector
import DashboardSelector from '@/pages/dashboards/DashboardSelector';

// Organization Setup Pages
import Departments from '@/pages/setup/Departments';
import Categories from '@/pages/setup/Categories';
import Employees from '@/pages/setup/Employees';

// Asset Pages
import AssetInventory from '@/pages/assets/AssetInventory';
import AssetDetail from '@/pages/assets/AssetDetail';

// Core Workflow Pages
import AllocationManager from '@/pages/allocations/AllocationManager';
import ResourceBooking from '@/pages/bookings/ResourceBooking';
import MaintenanceDashboard from '@/pages/maintenance/MaintenanceDashboard';
import AuditManager from '@/pages/audits/AuditManager';
import ReportsDashboard from '@/pages/reports/ReportsDashboard';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Authenticated Application routes wrapping Page components inside AppShell */}
          <Route
            path="/dashboard"
            element={
              <AppShell>
                <DashboardSelector />
              </AppShell>
            }
          />
          <Route
            path="/assets"
            element={
              <AppShell>
                <AssetInventory />
              </AppShell>
            }
          />
          <Route
            path="/assets/:id"
            element={
              <AppShell>
                <AssetDetail />
              </AppShell>
            }
          />
          <Route
            path="/allocations"
            element={
              <AppShell>
                <AllocationManager />
              </AppShell>
            }
          />
          <Route
            path="/bookings"
            element={
              <AppShell>
                <ResourceBooking />
              </AppShell>
            }
          />
          <Route
            path="/maintenance"
            element={
              <AppShell>
                <MaintenanceDashboard />
              </AppShell>
            }
          />
          <Route
            path="/audits"
            element={
              <AppShell>
                <AuditManager />
              </AppShell>
            }
          />
          <Route
            path="/reports"
            element={
              <AppShell>
                <ReportsDashboard />
              </AppShell>
            }
          />
          <Route
            path="/setup/departments"
            element={
              <AppShell>
                <Departments />
              </AppShell>
            }
          />
          <Route
            path="/setup/categories"
            element={
              <AppShell>
                <Categories />
              </AppShell>
            }
          />
          <Route
            path="/setup/employees"
            element={
              <AppShell>
                <Employees />
              </AppShell>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
