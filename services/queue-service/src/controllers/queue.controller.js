import { queueService } from "../services/queue.service.js";

export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    service: "janjicare-queue-service",
    status: "healthy",
    port: 3002,
    timestamp: new Date().toISOString(),
  });
}

export function createTicket(req, res, next) {
  try {
    const { ticket, is_duplicate } = queueService.generateTicket(req.body);
    res.status(is_duplicate ? 200 : 201).json({
      success: true,
      message: is_duplicate
        ? "Tiket antrean sudah ada (idempotent)."
        : "Nomor antrean berhasil dibuat.",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
}

export function getQueues(req, res, next) {
  try {
    const queues = queueService.getQueues(req.query);
    res.status(200).json({
      success: true,
      data: queues,
    });
  } catch (err) {
    next(err);
  }
}

export function getCurrentServing(req, res, next) {
  try {
    const current = queueService.getCurrentServing(
      req.params.doctorId,
      req.query.date
    );
    res.status(200).json({
      success: true,
      data: current,
    });
  } catch (err) {
    next(err);
  }
}

export function callNext(req, res, next) {
  try {
    const { doctor_id, date } = req.body;
    if (!doctor_id) {
      return res.status(400).json({
        success: false,
        message: "doctor_id wajib diisi.",
      });
    }

    const nextPatient = queueService.callNext(doctor_id, date);
    if (!nextPatient) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada pasien dalam antrean tunggu.",
        data: null,
      });
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

export function updateStatus(req, res, next) {
  try {
    const updated = queueService.updateTicketStatus(
      req.params.ticketId,
      req.body.status
    );
    res.status(200).json({
      success: true,
      message: "Status antrean berhasil diperbarui.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export function getStats(req, res, next) {
  try {
    const stats = queueService.getStats(req.query.date);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}
