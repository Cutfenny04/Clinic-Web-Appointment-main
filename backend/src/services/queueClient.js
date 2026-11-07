import { ApiError } from "../utils/ApiError.js";

/**
 * Klien HTTP ke Queue Microservice dengan token internal.
 * Kontrak ini sengaja sederhana (REST + JSON) agar nanti mudah diganti
 * menjadi pengiriman event ke Amazon SQS / pemanggilan Lambda.
 */
const BASE = (process.env.QUEUE_SERVICE_URL || "http://localhost:3002/api/v1/queue").replace(/\/$/, "");

async function request(path, { method = "GET", body, query, actorId } = {}) {
  const token = process.env.QUEUE_INTERNAL_TOKEN;
  if (!token) throw new ApiError(503, "Layanan antrean belum dikonfigurasi (QUEUE_INTERNAL_TOKEN).");

  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString()
    : "";
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": token,
        ...(actorId ? { "X-Actor-Id": actorId } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(503, "Layanan antrean sedang tidak dapat dihubungi. Coba lagi beberapa saat.");
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const status = res.status >= 500 ? 502 : res.status === 401 ? 502 : res.status;
    throw new ApiError(status, payload.message || "Layanan antrean mengembalikan kesalahan.");
  }
  return payload.data;
}

// Diekspor sebagai objek agar dapat diganti (stub) saat pengujian.
export const queueClient = {
  request,
  createTicket: (appointmentId, actorId) =>
    request("/ticket", { method: "POST", body: { appointment_id: appointmentId }, actorId }),
  list: (query) => request("/", { query }),
  stats: (query) => request("/stats", { query }),
  display: (date) => request("/display", { query: { date } }),
  current: (doctorId, date) => request(`/current/${doctorId}`, { query: { date } }),
  callNext: (doctorId, date, actorId) => request("/call", { method: "POST", body: { doctor_id: doctorId, date }, actorId }),
  setStatus: (ticketId, status, actorId) =>
    request(`/${ticketId}/status`, { method: "PATCH", body: { status }, actorId }),
};
