#!/usr/bin/env node
/**
 * Membuat semua rahasia untuk deploy AWS sekali jalan (jalankan di laptop atau EC2):
 *   node deploy/aws/scripts/generate-keys.mjs > rahasia.env
 *
 * - JWT_SECRET            : kunci tanda tangan JWT bersama GoTrue (Auth) & PostgREST
 * - ANON_KEY              : JWT role "anon"  → aman untuk frontend (pengganti publishable key)
 * - SERVICE_ROLE_KEY      : JWT role "service_role" → HANYA di backend
 * - QUEUE_INTERNAL_TOKEN  : token backend ↔ queue service
 * - AUTH_DB_PASSWORD / API_DB_PASSWORD : password role database supabase_auth_admin / authenticator
 *
 * JANGAN commit hasilnya ke Git.
 */
import { createHmac, randomBytes } from "node:crypto";

const b64url = (b) => Buffer.from(b).toString("base64url");
const secret = randomBytes(48).toString("base64url");
const sign = (payload) => {
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
};
const now = Math.floor(Date.now() / 1000);
const tenYears = now + 10 * 365 * 24 * 3600;
const pw = () => randomBytes(18).toString("base64url").replace(/[-_]/g, "x");

console.log(`# Dibuat ${new Date().toISOString()} — simpan aman, jangan di-commit
JWT_SECRET=${secret}
ANON_KEY=${sign({ role: "anon", iss: "janjicare", iat: now, exp: tenYears })}
SERVICE_ROLE_KEY=${sign({ role: "service_role", iss: "janjicare", iat: now, exp: tenYears })}
QUEUE_INTERNAL_TOKEN=${randomBytes(32).toString("hex")}
AUTH_DB_PASSWORD=${pw()}
API_DB_PASSWORD=${pw()}`);
