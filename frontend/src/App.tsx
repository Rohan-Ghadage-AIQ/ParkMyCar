import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoSwitcherBar } from './components/DemoSwitcherBar';
import { Navbar } from './components/Navbar';
import { FooterAttribution } from './components/FooterAttribution';

// Owner pages
import { OwnerHome } from './pages/owner/OwnerHome';
import { LotDetailPage } from './pages/owner/LotDetailPage';
import { TicketConfirmationPage } from './pages/owner/TicketConfirmationPage';
import { MyBookingsPage } from './pages/owner/MyBookingsPage';

// Marshal pages
import { MarshalDashboard } from './pages/marshal/MarshalDashboard';
import { ScanVerifyPage } from './pages/marshal/ScanVerifyPage';
import { WalkInPage } from './pages/marshal/WalkInPage';
import { CheckOutPage } from './pages/marshal/CheckOutPage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LotsManagementPage } from './pages/admin/LotsManagementPage';
import { BookingsListPage } from './pages/admin/BookingsListPage';
import { DisputeQueuePage } from './pages/admin/DisputeQueuePage';
import { ShiftReconciliationPage } from './pages/admin/ShiftReconciliationPage';
import { DataImportPage } from './pages/admin/DataImportPage';
import { DataReportsPage } from './pages/admin/DataReportsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// Auth
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

// Role Guards
const RoleRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!allowedRoles.includes(role || '')) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <DemoSwitcherBar />
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Owner routes */}
          <Route path="/" element={<OwnerHome />} />
          <Route path="/lot/:id" element={<LotDetailPage />} />
          <Route path="/ticket/:bookingCode" element={<TicketConfirmationPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />

          {/* Marshal routes */}
          <Route
            path="/marshal"
            element={
              <RoleRoute allowedRoles={['MARSHAL', 'ADMIN']}>
                <MarshalDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/marshal/scan"
            element={
              <RoleRoute allowedRoles={['MARSHAL', 'ADMIN']}>
                <ScanVerifyPage />
              </RoleRoute>
            }
          />
          <Route
            path="/marshal/walkin"
            element={
              <RoleRoute allowedRoles={['MARSHAL', 'ADMIN']}>
                <WalkInPage currentLotId={1} />
              </RoleRoute>
            }
          />
          <Route
            path="/marshal/checkout"
            element={
              <RoleRoute allowedRoles={['MARSHAL', 'ADMIN']}>
                <CheckOutPage currentLotId={1} />
              </RoleRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/lots"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <LotsManagementPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <BookingsListPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/disputes"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <DisputeQueuePage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/shifts"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <ShiftReconciliationPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/import"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <DataImportPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <DataReportsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <AuditLogsPage />
              </RoleRoute>
            }
          />

          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FooterAttribution />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
