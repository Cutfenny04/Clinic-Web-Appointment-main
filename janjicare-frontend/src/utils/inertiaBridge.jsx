import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

/**
 * Drop-in replacement for Inertia's <Link> component
 */
export const Link = React.forwardRef(({ href, to, children, className, method, as, onClick, replace, preserveScroll, preserveState, ...props }, ref) => {
  const target = to || href || '#';
  const navigate = useNavigate();
  const { logout } = useAuth();

  // If used as button or non-GET method (e.g. logout POST button in modals)
  if (as === 'button' || (method && method.toLowerCase() !== 'get')) {
    const handleClick = (e) => {
      if (onClick) onClick(e);
      if (e.defaultPrevented) return;
      e.preventDefault();

      if (target === '/logout' || target.includes('logout')) {
        logout();
        navigate('/login');
      } else {
        navigate(target, { replace });
      }
    };

    return (
      <button ref={ref} type="button" className={className} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }

  return (
    <RouterLink ref={ref} to={target} className={className} onClick={onClick} replace={replace} {...props}>
      {children}
    </RouterLink>
  );
});

Link.displayName = 'InertiaLinkBridge';

/**
 * Drop-in replacement for Inertia's <Head> component
 */
export function Head({ title, children }) {
  useEffect(() => {
    if (title) {
      document.title = `${title} - JanjiCare`;
    }
  }, [title]);

  return <>{children}</>;
}

/**
 * Drop-in replacement for Inertia's usePage() hook
 */
export function usePage() {
  const location = useLocation();
  const auth = useAuth();

  return {
    component: 'App',
    url: location.pathname + location.search,
    props: {
      auth: {
        user: auth?.user || {
          id: 1,
          name: 'Demo Admin',
          email: 'admin@janjicare.com',
          role: 'admin',
        },
      },
      flash: {},
      errors: {},
    },
  };
}

/**
 * Drop-in replacement for Inertia's useForm() hook
 */
export function useForm(initialValues = {}) {
  const [data, setDataState] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [wasSuccessful, setWasSuccessful] = useState(false);
  const [recentlySuccessful, setRecentlySuccessful] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const setData = (keyOrFn, maybeValue) => {
    if (typeof keyOrFn === 'function') {
      setDataState(keyOrFn);
    } else if (typeof keyOrFn === 'object' && keyOrFn !== null && maybeValue === undefined) {
      setDataState((prev) => ({ ...prev, ...keyOrFn }));
    } else {
      setDataState((prev) => ({ ...prev, [keyOrFn]: maybeValue }));
    }
  };

  const reset = (...fields) => {
    if (fields.length === 0) {
      setDataState(initialValues);
    } else {
      setDataState((prev) => {
        const next = { ...prev };
        fields.forEach((f) => {
          next[f] = initialValues[f];
        });
        return next;
      });
    }
  };

  const clearErrors = (...fields) => {
    if (fields.length === 0) {
      setErrors({});
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        fields.forEach((f) => delete next[f]);
        return next;
      });
    }
  };

  const setError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleRequest = async (method, url, options = {}) => {
    setProcessing(true);
    setErrors({});
    if (options.onStart) options.onStart();

    // Special case for Login/Logout demo flow
    if (url === '/login' || url.includes('/login')) {
      const email = data.email || 'admin@janjicare.com';
      const user = auth.login(email);
      setProcessing(false);
      setWasSuccessful(true);
      if (options.onSuccess) options.onSuccess({ user });
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'doctor') navigate('/doctor/dashboard');
      else navigate('/patient/dashboard');
      return;
    }

    if (url === '/logout' || url.includes('/logout')) {
      auth.logout();
      setProcessing(false);
      setWasSuccessful(true);
      if (options.onSuccess) options.onSuccess();
      navigate('/login');
      return;
    }

    try {
      const response = await api({
        method,
        url,
        data,
      });

      setWasSuccessful(true);
      setRecentlySuccessful(true);
      setTimeout(() => setRecentlySuccessful(false), 2000);

      if (options.onSuccess) options.onSuccess(response);
      return response;
    } catch (err) {
      const responseErrors = err?.response?.data?.errors || { general: err.message || 'Operation failed' };
      setErrors(responseErrors);
      if (options.onError) options.onError(responseErrors);
    } finally {
      setProcessing(false);
      if (options.onFinish) options.onFinish();
    }
  };

  return {
    data,
    setData,
    errors,
    processing,
    wasSuccessful,
    recentlySuccessful,
    reset,
    clearErrors,
    setError,
    post: (url, options) => handleRequest('post', url, options),
    put: (url, options) => handleRequest('put', url, options),
    patch: (url, options) => handleRequest('patch', url, options),
    delete: (url, options) => handleRequest('delete', url, options),
    get: (url, options) => handleRequest('get', url, options),
    cancel: () => {},
  };
}

/**
 * Drop-in replacement for Inertia's router singleton
 */
export const router = {
  visit: (url, options = {}) => {
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  },
  get: (url, data, options = {}) => {
    return api.get(url, { params: data });
  },
  post: (url, data, options = {}) => {
    return api.post(url, data);
  },
  put: (url, data, options = {}) => {
    return api.put(url, data);
  },
  patch: (url, data, options = {}) => {
    return api.patch(url, data);
  },
  delete: (url, options = {}) => {
    return api.delete(url);
  },
  reload: (options = {}) => {
    if (options.onFinish) options.onFinish();
  },
};

export default {
  Link,
  Head,
  usePage,
  useForm,
  router,
};
