import crypto from "node:crypto";

/**
 * QueueService — In-memory robust queue manager dengan deduplikasi dan state persistence
 */
class QueueService {
  constructor() {
    // tickets: Array of all tickets
    this.tickets = [];
    // appointmentToTicket: Map<appointment_id, ticket_id> untuk pencegahan request duplikat
    this.appointmentToTicket = new Map();
  }

  /**
   * Membuat atau mengembalikan tiket antrean (Idempotent)
   */
  generateTicket({
    appointment_id,
    doctor_id,
    doctor_name = "Dokter",
    patient_id,
    patient_name = "Pasien",
    schedule_id,
    date = new Date().toISOString().split("T")[0],
  }) {
    // 1. Pencegahan duplikat: jika appointment_id sudah terdaftar, kembalikan tiket yang ada
    if (appointment_id && this.appointmentToTicket.has(appointment_id)) {
      const existingId = this.appointmentToTicket.get(appointment_id);
      const existing = this.tickets.find((t) => t.id === existingId);
      if (existing) {
        return { ticket: existing, is_duplicate: true };
      }
    }

    // 2. Hitung nomor urut antrean untuk dokter & tanggal yang bersangkutan
    const existingDoctorDateTickets = this.tickets.filter(
      (t) => t.doctor_id === doctor_id && t.date === date
    );

    const queueNumber = existingDoctorDateTickets.length + 1;
    const ticketId = crypto.randomUUID();
    const queueCode = `A-${String(queueNumber).padStart(3, "0")}`;

    const newTicket = {
      id: ticketId,
      appointment_id,
      doctor_id,
      doctor_name,
      patient_id,
      patient_name,
      schedule_id,
      date,
      queue_number: queueNumber,
      queue_code: queueCode,
      status: "waiting", // waiting | calling | serving | done | skipped
      called_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tickets.push(newTicket);
    if (appointment_id) {
      this.appointmentToTicket.set(appointment_id, ticketId);
    }

    return { ticket: newTicket, is_duplicate: false };
  }

  /**
   * Mengambil daftar antrean dengan filter
   */
  getQueues({ doctor_id, date, status } = {}) {
    let result = [...this.tickets];

    if (doctor_id) {
      result = result.filter((t) => t.doctor_id === doctor_id);
    }

    if (date) {
      result = result.filter((t) => t.date === date);
    }

    if (status) {
      result = result.filter((t) => t.status === status);
    }

    return result.sort((a, b) => a.queue_number - b.queue_number);
  }

  /**
   * Mengambil pasien yang sedang dipanggil atau dilayani
   */
  getCurrentServing(doctorId, date = new Date().toISOString().split("T")[0]) {
    const active = this.tickets.filter(
      (t) =>
        t.doctor_id === doctorId &&
        t.date === date &&
        (t.status === "calling" || t.status === "serving")
    );

    return active[0] || null;
  }

  /**
   * Memanggil nomor antrean berikutnya
   */
  callNext(doctorId, date = new Date().toISOString().split("T")[0]) {
    // 1. Jika ada yang sedang serving, anggap selesai ('done')
    const current = this.tickets.find(
      (t) =>
        t.doctor_id === doctorId &&
        t.date === date &&
        (t.status === "calling" || t.status === "serving")
    );

    if (current) {
      current.status = "done";
      current.updated_at = new Date().toISOString();
    }

    // 2. Ambil antrean 'waiting' berikutnya
    const nextInLine = this.tickets
      .filter(
        (t) => t.doctor_id === doctorId && t.date === date && t.status === "waiting"
      )
      .sort((a, b) => a.queue_number - b.queue_number)[0];

    if (!nextInLine) {
      return null;
    }

    nextInLine.status = "calling";
    nextInLine.called_at = new Date().toISOString();
    nextInLine.updated_at = new Date().toISOString();

    return nextInLine;
  }

  /**
   * Mengubah status tiket antrean
   */
  updateTicketStatus(ticketId, newStatus) {
    const validStatuses = ["waiting", "calling", "serving", "done", "skipped"];
    if (!validStatuses.includes(newStatus)) {
      throw {
        statusCode: 400,
        message: `Status tidak valid. Harus salah satu dari: ${validStatuses.join(", ")}`,
      };
    }

    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) {
      throw { statusCode: 404, message: "Tiket antrean tidak ditemukan." };
    }

    ticket.status = newStatus;
    ticket.updated_at = new Date().toISOString();
    return ticket;
  }

  /**
   * Statistik ringkas antrean
   */
  getStats(date = new Date().toISOString().split("T")[0]) {
    const todayTickets = this.tickets.filter((t) => t.date === date);
    return {
      date,
      total: todayTickets.length,
      waiting: todayTickets.filter((t) => t.status === "waiting").length,
      calling: todayTickets.filter((t) => t.status === "calling").length,
      serving: todayTickets.filter((t) => t.status === "serving").length,
      done: todayTickets.filter((t) => t.status === "done").length,
      skipped: todayTickets.filter((t) => t.status === "skipped").length,
    };
  }
}

export const queueService = new QueueService();
