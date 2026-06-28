import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './layout/Layout.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { ROLES } from './utils/constants.js';

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));
const RegisterClinicPage = lazy(() => import('./pages/registration/RegisterClinicPage.jsx'));
const RegistrationSuccessPage = lazy(() => import('./pages/registration/RegistrationSuccessPage.jsx'));
const BookingPage = lazy(() => import('./pages/booking/BookingPage.jsx'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage.jsx'));
const PatientsPage = lazy(() => import('./pages/patients/PatientsPage.jsx'));
const PatientDetailPage = lazy(() => import('./pages/patients/PatientDetailPage.jsx'));
const AppointmentsPage = lazy(() => import('./pages/appointments/AppointmentsPage.jsx'));
const QueuePage = lazy(() => import('./pages/queue/QueuePage.jsx'));
const VitalsPage = lazy(() => import('./pages/vitals/VitalsPage.jsx'));
const EmrPage = lazy(() => import('./pages/emr/EmrPage.jsx'));
const BillingPage = lazy(() => import('./pages/billing/BillingPage.jsx'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage.jsx'));
const StaffPage = lazy(() => import('./pages/staff/StaffPage.jsx'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage.jsx'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterClinicPage />} />
          <Route path="/register/success" element={<RegistrationSuccessPage />} />
          <Route path="/book/:clinicCode" element={<BookingPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/queue" element={<QueuePage />} />
              <Route path="/vitals" element={<VitalsPage />} />
              <Route path="/billing" element={<BillingPage />} />
            </Route>
          </Route>

          {/* Doctor + Admin only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.DOCTOR, ROLES.ADMINISTRATOR]} />}>
            <Route element={<Layout />}>
              <Route path="/emr" element={<EmrPage />} />
            </Route>
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMINISTRATOR]} />}>
            <Route element={<Layout />}>
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
