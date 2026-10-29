import React, { useEffect } from 'react';
import { useAuth, DEMO_USERS } from '../context/AuthContext';

/**
 * Route Guard for role-based navigation in frontend
 * Automatically adapts the demo session to match the requested route
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, switchRole } = useAuth();

  useEffect(() => {
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      // Auto-switch to the required role for smooth demo navigation
      const targetRole = allowedRoles[0];
      if (switchRole) {
        switchRole(targetRole);
      }
    }
  }, [allowedRoles, user, switchRole]);

  return children;
}
