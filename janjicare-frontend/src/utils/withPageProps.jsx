import React from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import { MOCK_DATA } from '../services/mockData';
import { useLocation } from 'react-router-dom';

/**
 * Higher Order Component (HOC) that injects auth and default data props
 * to migrated Inertia pages so they render seamlessly without PHP controllers.
 */
export function withPageProps(Component, customProps = {}) {
  return function WrappedPage(props) {
    const { user } = useAuth();
    const location = useLocation();

    // Determine appropriate user based on URL path or current auth
    let activeUser = user || DEMO_USERS.admin;
    if (location.pathname.startsWith('/doctor')) {
      activeUser = DEMO_USERS.doctor;
    } else if (location.pathname.startsWith('/patient')) {
      activeUser = DEMO_USERS.patient;
    } else if (location.pathname.startsWith('/admin')) {
      activeUser = DEMO_USERS.admin;
    }

    const authProp = {
      user: activeUser,
    };

    const mergedProps = {
      auth: authProp,
      doctorCount: MOCK_DATA.stats.doctorCount,
      patientCount: MOCK_DATA.stats.patientCount,
      appointmentCount: MOCK_DATA.stats.appointmentCount,
      scheduleCount: MOCK_DATA.stats.scheduleCount,
      stats: MOCK_DATA.stats,
      doctors: MOCK_DATA.doctors,
      specialties: MOCK_DATA.specialties,
      patients: MOCK_DATA.patients,
      patient: MOCK_DATA.patients[0],
      appointments: MOCK_DATA.appointments,
      schedules: MOCK_DATA.schedules,
      medications: MOCK_DATA.medications,
      queueData: MOCK_DATA.queueData,
      metrics: MOCK_DATA.stats,
      appointments_last_30_days: MOCK_DATA.appointments,
      top_doctors: MOCK_DATA.doctors,
      recent_appointments: MOCK_DATA.appointments,
      waiting_room: MOCK_DATA.appointments,
      canResetPassword: true,
      canLogin: true,
      canRegister: true,
      status: null,
      mustVerifyEmail: false,
      sessions: [
        {
          id: 'sess_1',
          ip_address: '127.0.0.1',
          is_current_device: true,
          agent: { is_desktop: true, platform: 'Windows', browser: 'Chrome' },
          last_active: 'Baru saja',
        },
      ],
      patientData: MOCK_DATA.patients[0],
      logs: [],
      topIps: [],
      auditLogs: [],
      lockedUsers: [],
      backups: [],
      charts: {
        appointments_by_day: [],
        status_distribution: [],
        patient_growth: [],
      },
      ...customProps,
      ...props,
    };

    return <Component {...mergedProps} />;
  };
}

export default withPageProps;
