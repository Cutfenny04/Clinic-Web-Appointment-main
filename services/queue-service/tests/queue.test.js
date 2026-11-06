import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function fetchJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

describe("Queue Service Health Check", () => {
  it("GET /api/v1/queue/health harus mengembalikan 200", async () => {
    const { status, body } = await fetchJson("/api/v1/queue/health");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.service, "janjicare-queue-service");
  });
});

describe("Queue Service — Pembuatan Tiket & Deduplikasi", () => {
  let createdTicketId;

  it("POST /api/v1/queue/ticket harus membuat tiket baru (201)", async () => {
    const payload = {
      appointment_id: "appt-uuid-001",
      doctor_id: "doc-uuid-001",
      doctor_name: "dr. Sarah",
      patient_id: "pat-uuid-001",
      patient_name: "Budi Santoso",
      schedule_id: "sched-uuid-001",
      date: "2026-11-06",
    };

    const { status, body } = await fetchJson("/api/v1/queue/ticket", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.equal(body.data.queue_code, "A-001");
    assert.equal(body.data.status, "waiting");
    createdTicketId = body.data.id;
  });

  it("POST /api/v1/queue/ticket dengan appointment_id yang sama harus idempotent (200)", async () => {
    const payload = {
      appointment_id: "appt-uuid-001",
      doctor_id: "doc-uuid-001",
      patient_id: "pat-uuid-001",
      schedule_id: "sched-uuid-001",
      date: "2026-11-06",
    };

    const { status, body } = await fetchJson("/api/v1/queue/ticket", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.id, createdTicketId, "Harus mengembalikan tiket yang sama");
    assert.ok(body.message.includes("idempotent"));
  });

  it("POST /api/v1/queue/ticket untuk pasien berikutnya harus urut (A-002)", async () => {
    const payload = {
      appointment_id: "appt-uuid-002",
      doctor_id: "doc-uuid-001",
      patient_id: "pat-uuid-002",
      patient_name: "Siti Rahma",
      schedule_id: "sched-uuid-001",
      date: "2026-11-06",
    };

    const { status, body } = await fetchJson("/api/v1/queue/ticket", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    assert.equal(status, 201);
    assert.equal(body.data.queue_code, "A-002");
    assert.equal(body.data.queue_number, 2);
  });
});

describe("Queue Service — Pemanggilan & Status Antrean", () => {
  it("POST /api/v1/queue/call memanggil pasien pertama (A-001)", async () => {
    const { status, body } = await fetchJson("/api/v1/queue/call", {
      method: "POST",
      body: JSON.stringify({
        doctor_id: "doc-uuid-001",
        date: "2026-11-06",
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.queue_code, "A-001");
    assert.equal(body.data.status, "calling");
  });

  it("GET /api/v1/queue/current/:doctorId menampilkan pasien yang sedang dipanggil", async () => {
    const { status, body } = await fetchJson(
      "/api/v1/queue/current/doc-uuid-001?date=2026-11-06"
    );

    assert.equal(status, 200);
    assert.ok(body.data);
    assert.equal(body.data.queue_code, "A-001");
  });

  it("POST /api/v1/queue/call memanggil pasien berikutnya (A-002) dan menandai A-001 done", async () => {
    const { status, body } = await fetchJson("/api/v1/queue/call", {
      method: "POST",
      body: JSON.stringify({
        doctor_id: "doc-uuid-001",
        date: "2026-11-06",
      }),
    });

    assert.equal(status, 200);
    assert.equal(body.data.queue_code, "A-002");
    assert.equal(body.data.status, "calling");
  });

  it("GET /api/v1/queue/stats mengembalikan statistik antrean", async () => {
    const { status, body } = await fetchJson("/api/v1/queue/stats?date=2026-11-06");

    assert.equal(status, 200);
    assert.equal(body.data.total, 2);
    assert.equal(body.data.done, 1);
    assert.equal(body.data.calling, 1);
  });
});
