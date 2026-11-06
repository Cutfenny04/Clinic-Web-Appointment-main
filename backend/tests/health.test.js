/**
 * Test: Health Check
 *
 * Verifikasi bahwa server Express berjalan dan endpoint /api/health
 * mengembalikan response yang benar.
 *
 * Jalankan: node --test tests/health.test.js
 * (Memerlukan Node.js v18+ untuk built-in test runner)
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import "dotenv/config";

// Import app tanpa menjalankan server
import app from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  // Jalankan server di port acak agar tidak bentrok
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

// ── Helper ────────────────────────────────────────────────────────
async function fetchJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ── Test Cases ────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("harus mengembalikan status 200 dan success: true", async () => {
    const { status, body } = await fetchJson("/api/health");

    assert.equal(status, 200, `Expected 200, got ${status}`);
    assert.equal(body.success, true);
    assert.equal(body.service, "janjicare-api");
    assert.ok(body.timestamp, "Harus ada timestamp");
  });
});

describe("404 Handler", () => {
  it("harus mengembalikan 404 untuk endpoint yang tidak ada", async () => {
    const { status, body } = await fetchJson("/api/v1/endpoint-tidak-ada");

    assert.equal(status, 404);
    assert.equal(body.success, false);
    assert.ok(body.message.includes("tidak ditemukan"));
  });
});

describe("POST /api/v1/auth/register — Validasi Input", () => {
  it("harus mengembalikan 400 jika body kosong", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({}),
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
    assert.ok(Array.isArray(body.errors), "Harus ada array errors");
  });

  it("harus mengembalikan 400 jika email tidak valid", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "Test User",
        email: "bukan-email",
        password: "password123",
      }),
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });

  it("harus mengembalikan 400 jika password terlalu pendek", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: "Test User",
        email: "test@example.com",
        password: "short",
      }),
    });

    assert.equal(status, 400);
    assert.equal(body.success, false);
  });
});

describe("GET /api/v1/auth/me — Auth Guard", () => {
  it("harus mengembalikan 401 tanpa token", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/me");

    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("harus mengembalikan 401 dengan token palsu", async () => {
    const url = `${baseUrl}/api/v1/auth/me`;
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_palsu_12345",
      },
    });
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });
});

describe("RBAC & Auth Guard — Endpoint yang dilindungi", () => {
  it("POST /api/v1/doctors harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/doctors", {
      method: "POST",
      body: JSON.stringify({ name: "Dr. Test" }),
    });
    assert.equal(status, 401);
  });

  it("POST /api/v1/schedules harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/schedules", {
      method: "POST",
      body: JSON.stringify({
        schedule_date: "2026-12-01",
        start_time: "09:00",
        end_time: "12:00",
      }),
    });
    assert.equal(status, 401);
  });

  it("POST /api/v1/appointments harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/appointments", {
      method: "POST",
      body: JSON.stringify({
        schedule_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    assert.equal(status, 401);
  });

  it("GET /api/v1/appointments/mine harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/appointments/mine");
    assert.equal(status, 401);
  });

  it("PATCH /api/v1/appointments/123/cancel harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/appointments/123/cancel", {
      method: "PATCH",
    });
    assert.equal(status, 401);
  });

  it("GET /api/v1/users harus 401 tanpa token", async () => {
    const { status } = await fetchJson("/api/v1/users");
    assert.equal(status, 401);
  });
});

describe("Public Endpoints", () => {
  it("GET /api/v1/doctors harus mengembalikan 200", async () => {
    const { status, body } = await fetchJson("/api/v1/doctors");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /api/v1/schedules harus mengembalikan 200", async () => {
    const { status, body } = await fetchJson("/api/v1/schedules");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });
});

