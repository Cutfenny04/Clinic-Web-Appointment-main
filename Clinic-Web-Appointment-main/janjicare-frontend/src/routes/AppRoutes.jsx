import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import withPageProps from '../utils/withPageProps';

// Lazy loaded page components
const RawWelcome = lazy(() => import('../pages/Welcome'));
const RawErrorPage = lazy(() => import('../pages/Error'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Auth
const RawLogin = lazy(() => import('../pages/auth/Login'));
const RawRegister = lazy(() => import('../pages/auth/Register'));
const RawForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const RawResetPassword = lazy(() => import('../pages/auth/ResetPassword'));
const RawConfirmPassword = lazy(() => import('../pages/auth/ConfirmPassword'));
const RawVerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'));
const RawVerify2FA = lazy(() => import('../pages/auth/Verify2FA'));

// Admin Pages
const RawAdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const RawAdminDoctors = lazy(() => import('../pages/admin/Doctors'));
const RawAdminPatients = lazy(() => import('../pages/admin/Patients'));
const RawAdminAppointments = lazy(() => import('../pages/admin/Appointments'));
const RawAdminSchedules = lazy(() => import('../pages/admin/Schedules'));
const RawAdminPharmacy = lazy(() => import('../pages/admin/Pharmacy'));
const RawAdminReports = lazy(() => import('../pages/admin/Reports'));
const RawAdminAnalytics = lazy(() => import('../pages/admin/Analytics'));
const RawAdminAI = lazy(() => import('../pages/admin/AI'));
const RawAdminSecurity = lazy(() => import('../pages/admin/Security'));

// Doctor Pages
const RawDoctorDashboard = lazy(() => import('../pages/doctor/Dashboard'));
const RawDoctorAppointments = lazy(() => import('../pages/doctor/Appointments'));
const RawDoctorPatients = lazy(() => import('../pages/doctor/Patients'));
const RawDoctorPatientEMR = lazy(() => import('../pages/doctor/PatientEMR'));
const RawDoctorSchedules = lazy(() => import('../pages/doctor/Schedules'));
const RawDoctorHistory = lazy(() => import('../pages/doctor/History'));
const RawDoctorAnalytics = lazy(() => import('../pages/doctor/Analytics'));

// Patient Pages
const RawPatientDashboard = lazy(() => import('../pages/patient/Dashboard'));
const RawPatientDoctors = lazy(() => import('../pages/patient/Doctors'));
const RawPatientSchedules = lazy(() => import('../pages/patient/Schedules'));
const RawPatientAppointments = lazy(() => import('../pages/patient/Appointments'));
const RawPatientHistory = lazy(() => import('../pages/patient/History'));

// Shared / Special
const RawProfileEdit = lazy(() => import('../pages/profile/Edit'));
const RawQueueTV = lazy(() => import('../pages/queue/TV'));
const RawTelehealthRoom = lazy(() => import('../pages/telehealth/Room'));

// Wrapped pages with default props
const Welcome = withPageProps(RawWelcome);
const ErrorPage = withPageProps(RawErrorPage);
const Login = withPageProps(RawLogin);
const Register = withPageProps(RawRegister);
const ForgotPassword = withPageProps(RawForgotPassword);
const ResetPassword = withPageProps(RawResetPassword);
const ConfirmPassword = withPageProps(RawConfirmPassword);
const VerifyEmail = withPageProps(RawVerifyEmail);
const Verify2FA = withPageProps(RawVerify2FA);

const AdminDashboard = withPageProps(RawAdminDashboard);
const AdminDoctors = withPageProps(RawAdminDoctors);
const AdminPatients = withPageProps(RawAdminPatients);
const AdminAppointments = withPageProps(RawAdminAppointments);
const AdminSchedules = withPageProps(RawAdminSchedules);
const AdminPharmacy = withPageProps(RawAdminPharmacy);
const AdminReports = withPageProps(RawAdminReports);
const AdminAnalytics = withPageProps(RawAdminAnalytics);
const AdminAI = withPageProps(RawAdminAI);
const AdminSecurity = withPageProps(RawAdminSecurity);

const DoctorDashboard = withPageProps(RawDoctorDashboard);
const DoctorAppointments = withPageProps(RawDoctorAppointments);
const DoctorPatients = withPageProps(RawDoctorPatients);
const DoctorPatientEMR = withPageProps(RawDoctorPatientEMR);
const DoctorSchedules = withPageProps(RawDoctorSchedules);
const DoctorHistory = withPageProps(RawDoctorHistory);
const DoctorAnalytics = withPageProps(RawDoctorAnalytics);

const PatientDashboard = withPageProps(RawPatientDashboard);
const PatientDoctors = withPageProps(RawPatientDoctors);
const PatientSchedules = withPageProps(RawPatientSchedules);
const PatientAppointments = withPageProps(RawPatientAppointments);
const PatientHistory = withPageProps(RawPatientHistory);

const ProfileEdit = withPageProps(RawProfileEdit);
const QueueTV = withPageProps(RawQueueTV);
const TelehealthRoom = withPageProps(RawTelehealthRoom);

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Memuat JanjiCare...</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Welcome />} />
        <Route path="/error" element={<ErrorPage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/confirm-password" element={<ConfirmPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/doctors" element={<ProtectedRoute allowedRoles={['admin']}><AdminDoctors /></ProtectedRoute>} />
        <Route path="/admin/patients" element={<ProtectedRoute allowedRoles={['admin']}><AdminPatients /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute allowedRoles={['admin']}><AdminAppointments /></ProtectedRoute>} />
        <Route path="/admin/schedules" element={<ProtectedRoute allowedRoles={['admin']}><AdminSchedules /></ProtectedRoute>} />
        <Route path="/admin/pharmacy" element={<ProtectedRoute allowedRoles={['admin']}><AdminPharmacy /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/ai" element={<ProtectedRoute allowedRoles={['admin']}><AdminAI /></ProtectedRoute>} />
        <Route path="/admin/security" element={<ProtectedRoute allowedRoles={['admin']}><AdminSecurity /></ProtectedRoute>} />

        {/* Doctor Routes */}
        <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorAppointments /></ProtectedRoute>} />
        <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
        <Route path="/doctor/patients/:id/emr" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorPatientEMR /></ProtectedRoute>} />
        <Route path="/doctor/schedules" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorSchedules /></ProtectedRoute>} />
        <Route path="/doctor/history" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorHistory /></ProtectedRoute>} />
        <Route path="/doctor/analytics" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorAnalytics /></ProtectedRoute>} />

        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/doctors" element={<ProtectedRoute allowedRoles={['patient']}><PatientDoctors /></ProtectedRoute>} />
        <Route path="/patient/schedules" element={<ProtectedRoute allowedRoles={['patient']}><PatientSchedules /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><PatientAppointments /></ProtectedRoute>} />
        <Route path="/patient/history" element={<ProtectedRoute allowedRoles={['patient']}><PatientHistory /></ProtectedRoute>} />

        {/* Shared Authenticated Routes */}
        <Route path="/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
        <Route path="/queue/tv" element={<QueueTV />} />
        <Route path="/telehealth/room/:appointment" element={<ProtectedRoute><TelehealthRoom /></ProtectedRoute>} />
        <Route path="/telehealth/:roomName" element={<ProtectedRoute><TelehealthRoom /></ProtectedRoute>} />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
