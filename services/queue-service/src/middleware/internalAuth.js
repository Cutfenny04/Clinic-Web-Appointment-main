import crypto from "node:crypto";
import { config } from "../config/index.js";

/**
 * Hanya backend utama (atau worker/Lambda internal) yang boleh memanggil Queue Service.
 * Header: X-Internal-Token: <QUEUE_INTERNAL_TOKEN>
 * Opsional: X-Actor-Id: <uuid pengguna yang memicu aksi> (untuk riwayat status)
 */
export function internalAuth(req, res, next) {
  if (!config.internalToken) {
    return res.status(503).json({
      success: false,
      message: "QUEUE_INTERNAL_TOKEN belum dikonfigurasi pada Queue Service.",
    });
  }
  const given = Buffer.from(String(req.get("x-internal-token") || ""));
  const expected = Buffer.from(config.internalToken);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ success: false, message: "Token internal tidak valid." });
  }
  const actor = req.get("x-actor-id");
  req.actorId = actor && /^[0-9a-f-]{36}$/i.test(actor) ? actor : null;
  next();
}
