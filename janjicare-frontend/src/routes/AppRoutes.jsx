import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute, { RoleBasedRoute, GuestRoute, DashboardRedirect } from "./ProtectedRoute";
import withPageProps from "../utils/withPageProps";
import FullPageLoader from "../components/FullPageLoader";

/*
 * Peta route JanjiCare.
 * Fitur yang belum memiliki backend (Apotek, AI Chatbot, Keamanan/Audit, Telehealth, EMR/Vitals, 2FA,
 * Analitik lama) TIDAK dirutekan. Kode sumbernya tetap ada di src/pages — lihat docs/ROADMAP.md.
 */

// Publik
const Welcome = withPageProps(lazy(() => import("../pages/Welcome")));
const NotFound = lazy(() => import("../pages/NotFound"));
const AccessDenied = lazy(() => import("../pages/errors/AccessDenied"));
const QueueTV = lazy(() => import("../pages/queue/TV"));

// Auth
const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

// Admin
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminDoctors = lazy(() => import("../pages/admin/Doctors"));
const AdminPatients = lazy(() => import("../pages/admin/Patients"));
const AdminSchedules = lazy(() => import("../pages/admin/Schedules"));
const AdminAppointments = lazy(() => import("../pages/admin/Appointments"));
const AdminQueue = lazy(() => import("../pages/admin/Queue"));
const AdminReports = lazy(() => import("../pages/admin/Reports"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));

// Dokter
const DoctorDashboard = lazy(() => import("../pages/doctor/Dashboard"));
const DoctorSchedules = lazy(() => import("../pages/doctor/Schedules"));
const DoctorPatients = lazy(() => import("../pages/doctor/Patients"));
const DoctorQueue = lazy(() => import("../pages/doctor/Queue"));
const DoctorConsultation = lazy(() => import("../pages/doctor/Consultation"));
const DoctorHistory = lazy(() => import("../pages/doctor/History"));
const DoctorProfile = lazy(() => import("../pages/doctor/Profile"));

// Pasien
const PatientDashboard = lazy(() => import("../pages/patient/Dashboard"));
const PatientDoctors = lazy(() => import("../pages/patient/Doctors"));
const PatientDoctorDetail = lazy(() => import("../pages/patient/DoctorDetail"));
const PatientBook = lazy(() => import("../pages/patient/Book"));
const PatientAppointments = lazy(() => import("../pages/patient/Appointments"));
const PatientQueue = lazy(() => import("../pages/patient/Queue"));
const PatientHistory = lazy(() => import("../pages/patient/History"));
const PatientProfile = lazy(() => import("../pages/patient/Profile"));

const admin = (el) => <RoleBasedRoute roles={["admin"]}>{el}</RoleBasedRoute>;
const doctor = (el) => <RoleBasedRoute roles={["doctor"]}>{el}</RoleBasedRoute>;
const patient = (el) => <RoleBasedRoute roles={["patient"]}>{el}</RoleBasedRoute>;
const guest = (el) => <GuestRoute>{el}</GuestRoute>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* Publik */}
        <Route path="/" element={<Welcome />} />
        <Route path="/queue/tv" element={<QueueTV />} />
        <Route path="/403" element={<AccessDenied />} />

        {/* Autentikasi */}
        <Route path="/login" element={guest(<Login />)} />
        <Route path="/register" element={guest(<Register />)} />
        <Route path="/forgot-password" element={guest(<ForgotPassword />)} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/profile" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={admin(<AdminDashboard />)} />
        <Route path="/admin/doctors" element={admin(<AdminDoctors />)} />
        <Route path="/admin/patients" element={admin(<AdminPatients />)} />
        <Route path="/admin/schedules" element={admin(<AdminSchedules />)} />
        <Route path="/admin/appointments" element={admin(<AdminAppointments />)} />
        <Route path="/admin/queue" element={admin(<AdminQueue />)} />
        <Route path="/admin/reports" element={admin(<AdminReports />)} />
        <Route path="/admin/settings" element={admin(<AdminSettings />)} />

        {/* Dokter */}
        <Route path="/doctor" element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="/doctor/dashboard" element={doctor(<DoctorDashboard />)} />
        <Route path="/doctor/schedules" element={doctor(<DoctorSchedules />)} />
        <Route path="/doctor/patients" element={doctor(<DoctorPatients />)} />
        <Route path="/doctor/queue" element={doctor(<DoctorQueue />)} />
        <Route path="/doctor/consultation" element={doctor(<DoctorConsultation />)} />
        <Route path="/doctor/history" element={doctor(<DoctorHistory />)} />
        <Route path="/doctor/profile" element={doctor(<DoctorProfile />)} />
        <Route path="/doctor/appointments" element={<Navigate to="/doctor/patients" replace />} />

        {/* Pasien */}
        <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="/patient/dashboard" element={patient(<PatientDashboard />)} />
        <Route path="/patient/doctors" element={patient(<PatientDoctors />)} />
        <Route path="/patient/doctors/:id" element={patient(<PatientDoctorDetail />)} />
        <Route path="/patient/book" element={patient(<PatientBook />)} />
        <Route path="/patient/appointments" element={patient(<PatientAppointments />)} />
        <Route path="/patient/queue" element={patient(<PatientQueue />)} />
        <Route path="/patient/history" element={patient(<PatientHistory />)} />
        <Route path="/patient/profile" element={patient(<PatientProfile />)} />
        <Route path="/patient/schedules" element={<Navigate to="/patient/book" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
