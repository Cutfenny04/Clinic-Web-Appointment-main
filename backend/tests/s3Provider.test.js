import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { S3Client } from "@aws-sdk/client-s3";
import { createS3StorageProvider } from "../src/services/storage/s3Provider.js";

/**
 * Menguji provider S3 dengan SDK AWS sungguhan terhadap server tiruan S3 lokal
 * (PutObject / DeleteObject, path-style). Tidak butuh akun AWS.
 */
describe("Provider Amazon S3 (foto dokter)", () => {
  const objects = new Map();
  let server, client, failWith = null;

  before(async () => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        if (failWith) { res.writeHead(failWith.status, { "content-type": "application/xml" }); return res.end(`<Error><Code>${failWith.code}</Code><Message>x</Message></Error>`); }
        const key = decodeURIComponent(req.url.split("?")[0]).replace(/^\/[^/]+\//, "");
        if (req.method === "PUT") {
          objects.set(key, { body: Buffer.concat(chunks), type: req.headers["content-type"], cache: req.headers["cache-control"], bucket: req.url.split("/")[1] });
          res.writeHead(200, { ETag: '"x"' }); return res.end();
        }
        if (req.method === "DELETE") { objects.delete(key); res.writeHead(204); return res.end(); }
        res.writeHead(400); res.end();
      });
    });
    await new Promise((ok) => server.listen(0, ok));
    client = new S3Client({
      region: "us-east-1", endpoint: `http://127.0.0.1:${server.address().port}`, forcePathStyle: true,
      credentials: { accessKeyId: "uji", secretAccessKey: "uji" },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    });
  });
  after(() => server.close());

  it("mengunggah ke bucket dengan key berawalan doctor-photos/ dan Content-Type benar", async () => {
    const p = createS3StorageProvider({ client, bucket: "janjicare-foto" });
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    await p.put("abc/123-x.jpg", buf, "image/jpeg");
    const o = objects.get("doctor-photos/abc/123-x.jpg");
    assert.ok(o, [...objects.keys()].join());
    assert.equal(o.bucket, "janjicare-foto");
    assert.equal(o.type, "image/jpeg");
    assert.deepEqual(o.body, buf);
    assert.match(o.cache, /max-age=31536000/);
  });

  it("menghapus objek", async () => {
    const p = createS3StorageProvider({ client, bucket: "janjicare-foto" });
    await p.remove("abc/123-x.jpg");
    assert.equal(objects.has("doctor-photos/abc/123-x.jpg"), false);
  });

  it("error S3 diterjemahkan ke pesan Bahasa Indonesia", async () => {
    const p = createS3StorageProvider({ client, bucket: "janjicare-foto" });
    failWith = { status: 403, code: "AccessDenied" };
    await assert.rejects(p.put("a/b.jpg", Buffer.from("x"), "image/jpeg"), /LabInstanceProfile/);
    failWith = { status: 404, code: "NoSuchBucket" };
    await assert.rejects(p.put("a/b.jpg", Buffer.from("x"), "image/jpeg"), /tidak ditemukan/);
    failWith = null;
  });

  it("tanpa S3_BUCKET → pesan konfigurasi jelas", () => {
    delete process.env.S3_BUCKET;
    assert.throws(() => createS3StorageProvider({ client }), /S3_BUCKET belum diisi/);
  });
});
