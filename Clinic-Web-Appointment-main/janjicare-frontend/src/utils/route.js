/**
 * Route mapping dictionary from Laravel named routes to frontend React Router paths
 */
const routeMap = {
  // Public
  'welcome': '/',
  'home': '/',
  'dashboard': '/admin/dashboard',
  'login': '/login',
  'register': '/register',
  'password.request': '/forgot-password',
  'password.email': '/forgot-password',
  'password.reset': '/reset-password',
  'password.update': '/reset-password',
  'password.confirm': '/confirm-password',
  'verification.notice': '/verify-email',
  'verification.send': '/verify-email',
  'verification.verify': '/verify-email',
  '2fa.verify': '/verify-2fa',
  'logout': '/logout',

  // Profile
  'profile.edit': '/profile',
  'profile.update': '/profile',
  'profile.avatar.update': '/profile/avatar',
  'profile.destroy': '/profile',
  'profile.sessions.destroy': '/profile/sessions',
  'profile.sessions.destroySpecific': '/profile/sessions/:id',

  // TV Queue & Telehealth
  'queue.tv': '/queue/tv',
  'telehealth.room': '/telehealth/room/:appointment',

  // Admin Routes
  'admin.dashboard': '/admin/dashboard',
  'admin.doctors.index': '/admin/doctors',
  'admin.doctors.store': '/admin/doctors',
  'admin.doctors.update': '/admin/doctors/:doctor',
  'admin.doctors.destroy': '/admin/doctors/:doctor',
  'admin.doctors.history': '/admin/doctors/:doctor/history',
  'admin.patients.index': '/admin/patients',
  'admin.patients.store': '/admin/patients',
  'admin.patients.update': '/admin/patients/:patient',
  'admin.patients.destroy': '/admin/patients/:patient',
  'admin.patients.history': '/admin/patients/:patient/history',
  'admin.appointments.index': '/admin/appointments',
  'admin.appointments.updateStatus': '/admin/appointments/:appointment/status',
  'admin.appointments.cancel': '/admin/appointments/:appointment/cancel',
  'admin.schedules.index': '/admin/schedules',
  'admin.schedules.store': '/admin/schedules',
  'admin.schedules.update': '/admin/schedules/:schedule',
  'admin.schedules.destroy': '/admin/schedules/:schedule',
  'admin.reports.index': '/admin/reports',
  'admin.reports.export': '/admin/reports/export',
  'admin.analytics': '/admin/analytics',
  'admin.pharmacy.index': '/admin/pharmacy',
  'admin.pharmacy.store': '/admin/pharmacy',
  'admin.pharmacy.update': '/admin/pharmacy/:medicine',
  'admin.pharmacy.destroy': '/admin/pharmacy/:medicine',
  'admin.ai': '/admin/ai',
  'admin.ai.update': '/admin/ai',
  'admin.ai.test': '/admin/ai/test',
  'admin.security.index': '/admin/security',
  'admin.security.unlock': '/admin/security/unlock/:id',
  'admin.backups.create': '/admin/security/backup',
  'admin.backups.download': '/admin/security/backup/:filename',

  // Doctor Routes
  'doctor.dashboard': '/doctor/dashboard',
  'doctor.appointments.index': '/doctor/appointments',
  'doctor.appointments.updateStatus': '/doctor/appointments/:appointment/status',
  'doctor.appointments.complete': '/doctor/appointments/:appointment/complete',
  'doctor.schedules.index': '/doctor/schedules',
  'doctor.schedules.store': '/doctor/schedules',
  'doctor.schedules.update': '/doctor/schedules/:schedule',
  'doctor.schedules.destroy': '/doctor/schedules/:schedule',
  'doctor.history.index': '/doctor/history',
  'doctor.patients.index': '/doctor/patients',
  'doctor.patients.emr': '/doctor/patients/:id/emr',
  'doctor.analytics': '/doctor/analytics',

  // Patient Routes
  'patient.dashboard': '/patient/dashboard',
  'patient.doctors.index': '/patient/doctors',
  'patient.schedules.index': '/patient/schedules',
  'patient.appointments.index': '/patient/appointments',
  'patient.appointments.store': '/patient/appointments',
  'patient.appointments.cancel': '/patient/appointments/:appointment/cancel',
  'patient.history.index': '/patient/history',

  // Misc
  'notifications.read': '/notifications/:id/read',
  'notifications.read-all': '/notifications/read-all',
  'prescriptions.pdf': '/prescriptions/:appointment/pdf',
  'appointments.calendar': '/appointments/:appointment/calendar',
  'ai.triage': '/ai/triage',
  'ai.guest-triage': '/ai/guest-triage',
  'ai.session.get': '/ai/session',
  'ai.session.clear': '/ai/session/clear',
};

/**
 * Emulates Laravel Ziggy route() helper function
 */
export function route(name, params) {
  if (!name) {
    return {
      current: (pattern) => {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
        if (!pattern) return currentPath;
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          return currentPath.includes(prefix);
        }
        return routeMap[pattern] === currentPath;
      },
    };
  }

  let path = routeMap[name];
  if (!path) {
    // If not found, make a best-guess URL based on the name
    path = '/' + name.replace(/\./g, '/').replace('/index', '');
  }

  if (params !== undefined && params !== null) {
    if (typeof params === 'object' && !Array.isArray(params)) {
      Object.keys(params).forEach((key) => {
        path = path.replace(`:${key}`, params[key]);
      });
    } else {
      // Single primitive param: replace first :param
      path = path.replace(/:[a-zA-Z0-9_]+/, String(params));
    }
  }

  return path;
}

export default route;
