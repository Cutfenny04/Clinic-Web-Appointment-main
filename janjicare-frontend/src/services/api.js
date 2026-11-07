import axios from "axios";
import { supabase } from "../lib/supabase";

/**
 * Satu-satunya klien HTTP ke Backend JanjiCare (Express /api/v1).
 * - Token diambil dari sesi Supabase Auth (diperbarui otomatis oleh supabase-js).
 * - 401 TOKEN_INVALID → sesi diakhiri & pengguna diarahkan ke /login.
 * - Error dinormalisasi menjadi Error dengan pesan Bahasa Indonesia (+ status, errors).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* tanpa sesi: lanjut sebagai publik */
  }
  return config;
});

let onSessionExpired = null;
/** Dipasang oleh AuthContext agar interceptor dapat mengakhiri sesi. */
export function setSessionExpiredHandler(fn) {
  onSessionExpired = fn;
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data || {};
    let message;
    if (error.response) {
      message = body.message || pesanStatus(status);
      if (status === 401 && ["TOKEN_INVALID", "TOKEN_MISSING"].includes(body.code) && onSessionExpired) {
        onSessionExpired();
      }
    } else if (error.code === "ECONNABORTED") {
      message = "Server terlalu lama merespons. Coba lagi.";
    } else {
      message = `Tidak dapat terhubung ke backend JanjiCare (${API_BASE_URL}). Pastikan terminal backend berjalan (npm run dev di folder backend).`;
    }
    const err = new Error(message);
    err.status = status || 0;
    err.code = body.code;
    err.errors = body.errors || null;
    return Promise.reject(err);
  }
);

function pesanStatus(status) {
  if (status === 403) return "Anda tidak memiliki akses untuk tindakan ini.";
  if (status === 404) return "Data tidak ditemukan.";
  if (status === 429) return "Terlalu banyak permintaan. Coba lagi beberapa saat.";
  if (status >= 500) return "Terjadi kesalahan pada server. Coba lagi beberapa saat.";
  return "Permintaan gagal diproses.";
}

/** Endpoint terstruktur (selaras dengan docs/API.md) */
export const apiService = {
  get: (url, params) => api.get(url, { params }),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  patch: (url, data) => api.patch(url, data),
  delete: (url) => api.delete(url),

  auth: {
    register: (data) => api.post("/auth/register", data),
    me: () => api.get("/auth/me"),
    updateProfile: (data) => api.put("/auth/profile", data),
    logout: () => api.post("/auth/logout"),
  },
  admin: {
    stats: () => api.get("/admin/stats"),
    reports: (params) => api.get("/admin/reports", { params }),
  },
  users: {
    list: (params) => api.get("/users", { params }),
    get: (id) => api.get(`/users/${id}`),
    setActive: (id, is_active) => api.patch(`/users/${id}/status`, { is_active }),
  },
  doctors: {
    list: (params) => api.get("/doctors", { params }),
    get: (id) => api.get(`/doctors/${id}`),
    schedules: (id) => api.get(`/doctors/${id}/schedules`),
    create: (data) => api.post("/doctors", data),
    update: (id, data) => api.put(`/doctors/${id}`, data),
    remove: (id) => api.delete(`/doctors/${id}`),
  },
  schedules: {
    list: (params) => api.get("/schedules", { params }),
    create: (data) => api.post("/schedules", data),
    update: (id, data) => api.put(`/schedules/${id}`, data),
    remove: (id) => api.delete(`/schedules/${id}`),
  },
  appointments: {
    create: (data) => api.post("/appointments", data),
    mine: () => api.get("/appointments/mine"),
    list: (params) => api.get("/appointments", { params }),
    get: (id) => api.get(`/appointments/${id}`),
    cancel: (id, reason) => api.patch(`/appointments/${id}/cancel`, { reason }),
    setStatus: (id, status, extra = {}) => api.patch(`/appointments/${id}/status`, { status, ...extra }),
    checkIn: (id) => api.post(`/appointments/${id}/check-in`),
  },
  queue: {
    display: (date) => api.get("/queue/display", { params: { date } }),
    mine: () => api.get("/queue/mine"),
    today: (params) => api.get("/queue/today", { params }),
    callNext: (data = {}) => api.post("/queue/call", data),
    setStatus: (ticketId, status) => api.patch(`/queue/${ticketId}/status`, { status }),
  },
};

export default api;
