import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEMO_USERS = {
  admin: {
    id: 1,
    name: 'Administrator JanjiCare',
    email: 'admin@janjicare.com',
    role: 'admin',
    avatar: null,
    phone: '+62 812-3456-7890',
    email_verified_at: '2026-01-01T00:00:00.000Z',
    two_factor_confirmed_at: '2026-01-01T00:00:00.000Z',
  },
  doctor: {
    id: 2,
    name: 'dr. Sarah Jenkins, Sp.A',
    email: 'doctor@janjicare.com',
    role: 'doctor',
    specialization: 'Pediatrics',
    avatar: null,
    phone: '+62 813-9876-5432',
    email_verified_at: '2026-01-01T00:00:00.000Z',
  },
  patient: {
    id: 3,
    name: 'Budi Santoso',
    email: 'patient@janjicare.com',
    role: 'patient',
    avatar: null,
    phone: '+62 856-7890-1234',
    email_verified_at: '2026-01-01T00:00:00.000Z',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('janjicare_user');
      return saved ? JSON.parse(saved) : DEMO_USERS.admin;
    } catch {
      return DEMO_USERS.admin;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('janjicare_auth_token') || 'demo_token_123';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('janjicare_user', JSON.stringify(user));
    }
  }, [user]);

  const login = (roleOrEmail = 'admin') => {
    let targetUser = DEMO_USERS.admin;
    const lower = String(roleOrEmail).toLowerCase();
    if (lower === 'doctor' || lower.includes('doctor')) {
      targetUser = DEMO_USERS.doctor;
    } else if (lower === 'patient' || lower.includes('patient')) {
      targetUser = DEMO_USERS.patient;
    }
    setUser(targetUser);
    setToken('demo_token_' + Date.now());
    localStorage.setItem('janjicare_auth_token', 'demo_token_' + Date.now());
    localStorage.setItem('janjicare_user', JSON.stringify(targetUser));
    return targetUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('janjicare_auth_token');
    localStorage.removeItem('janjicare_user');
  };

  const switchRole = (newRole) => {
    if (DEMO_USERS[newRole]) {
      setUser(DEMO_USERS[newRole]);
      localStorage.setItem('janjicare_user', JSON.stringify(DEMO_USERS[newRole]));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || DEMO_USERS.admin,
        role: user?.role || 'admin',
        token,
        isAuthenticated: true,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context || {
    user: DEMO_USERS.admin,
    role: 'admin',
    isAuthenticated: true,
    login: () => DEMO_USERS.admin,
    logout: () => {},
    switchRole: () => {},
  };
}

export default AuthContext;
