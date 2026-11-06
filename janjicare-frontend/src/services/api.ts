import axios from "axios";
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Interceptor otomatis sematkan token Supabase
api.interceptors.request.use(async (config) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    console.warn("[API] Tidak dapat mengambil session Supabase:", err);
  }

  return config;
});

// Interceptor respons terpusat
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const msg = error.response.data?.message || "Terjadi kesalahan pada server.";
      return Promise.reject(new Error(msg));
    } else if (error.request) {
      return Promise.reject(
        new Error(
          "Tidak dapat terhubung ke Backend JanjiCare di " + API_BASE_URL
        )
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Endpoint wrappers terstruktur untuk frontend
 */
export const apiService = {
  // Generic
  get: (url: string, params?: Record<string, any>) => api.get(url, { params }),
  post: (url: string, data?: any) => api.post(url, data),
  put: (url: string, data?: any) => api.put(url, data),
  patch: (url: string, data?: any) => api.patch(url, data),
  delete: (url: string) => api.delete(url),

  // Auth
  auth: {
    register: (data: any) => api.post("/auth/register", data),
    login: (data: any) => api.post("/auth/login", data),
    logout: () => api.post("/auth/logout"),
    me: () => api.get("/auth/me"),
    profile: () => api.get("/auth/profile"),
    updateProfile: (data: any) => api.put("/auth/profile", data),
  },

  // Doctors
  doctors: {
    getAll: (params?: any) => api.get("/doctors", { params }),
    getById: (id: string) => api.get(`/doctors/${id}`),
    getSchedules: (doctorId: string) => api.get(`/doctors/${doctorId}/schedules`),
    create: (data: any) => api.post("/doctors", data),
    update: (id: string, data: any) => api.put(`/doctors/${id}`, data),
    delete: (id: string) => api.delete(`/doctors/${id}`),
  },

  // Schedules
  schedules: {
    getAll: (params?: any) => api.get("/schedules", { params }),
    create: (data: any) => api.post("/schedules", data),
    update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
    delete: (id: string) => api.delete(`/schedules/${id}`),
  },

  // Appointments
  appointments: {
    create: (data: any) => api.post("/appointments", data),
    getMine: () => api.get("/appointments/mine"),
    getAll: (params?: any) => api.get("/appointments", { params }),
    getById: (id: string) => api.get(`/appointments/${id}`),
    cancel: (id: string) => api.patch(`/appointments/${id}/cancel`),
    updateStatus: (id: string, status: string) =>
      api.patch(`/appointments/${id}/status`, { status }),
  },
};

export default api;