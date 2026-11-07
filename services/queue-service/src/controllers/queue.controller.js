import { queueService } from "../services/queue.service.js";
import { todayJakarta } from "../config/index.js";

export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    service: "janjicare-queue-service",
    status: "healthy",
    storage: "postgresql",
    timestamp: new Date().toISOString(),
  });
}

export async function createTicket(req, res, next) {
  try {
    const { ticket, is_duplicate } = await queueService.generateTicket(req.body, req.actorId);
    res.status(is_duplicate ? 200 : 201).json({
      success: true,
      message: is_duplicate ? "Tiket antrean sudah ada (idempotent)." : "Nomor antrean berhasil dibuat.",
      is_duplicate,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
}

export async function getQueues(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await queueService.getQueues(req.query) });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentServing(req, res, next) {
  try {
    const current = await queueService.getCurrentServing(req.params.doctorId, req.query.date || todayJakarta());
    res.status(200).json({ success: true, data: current });
  } catch (err) {
    next(err);
  }
}

export async function callNext(req, res, next) {
  try {
    const { doctor_id, date } = req.body;
    const nextPatient = await queueService.callNext(doctor_id, date || todayJakarta(), req.actorId);
    if (!nextPatient) {
      return res.status(200).json({ success: true, message: "Tidak ada pasien dalam antrean tunggu.", data: null });
    }
    res.status(200).json({
      success: true,
      message: `Memanggil antrean nomor ${nextPatient.queue_code}`,
      data: nextPatient,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const updated = await queueService.updateTicketStatus(req.params.ticketId, req.body.status, req.actorId);
    res.status(200).json({ success: true, message: "Status antrean berhasil diperbarui.", data: updated });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: await queueService.getStats(req.query.date || todayJakarta(), req.query.doctor_id || null),
    });
  } catch (err) {
    next(err);
  }
}

export async function getDisplay(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await queueService.getDisplay(req.query.date || todayJakarta()) });
  } catch (err) {
    next(err);
  }
}
