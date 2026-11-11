import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ApiError } from "../../utils/ApiError.js";

/**
 * Provider Amazon S3 untuk foto dokter (STORAGE_PROVIDER=s3).
 *
 * Kredensial TIDAK disimpan di .env: di EC2 diambil otomatis dari instance profile
 * (AWS Academy Learner Lab: "LabInstanceProfile" / LabRole).
 *
 * Konfigurasi:
 *   S3_BUCKET              nama bucket (wajib)
 *   AWS_REGION             mis. us-east-1
 *   S3_KEY_PREFIX          awalan key, default "doctor-photos/" — cocok dengan behavior
 *                          CloudFront "/doctor-photos/*" sehingga PUBLIC_PHOTO_BASE_URL =
 *                          https://<distribusi>.cloudfront.net/doctor-photos
 */
export function createS3StorageProvider({ client, bucket, prefix } = {}) {
  const Bucket = bucket ?? process.env.S3_BUCKET;
  const keyPrefix = prefix ?? process.env.S3_KEY_PREFIX ?? "doctor-photos/";
  if (!Bucket) throw new ApiError(503, "S3_BUCKET belum diisi pada server backend.");
  const s3 = client ?? new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
  const key = (path) => `${keyPrefix}${path}`;

  const explain = (err, verb) => {
    console.error(`[storage:s3] gagal ${verb}`, err.name, err.message);
    if (err.name === "NoSuchBucket") return new ApiError(503, `Bucket S3 "${Bucket}" tidak ditemukan.`);
    if (err.name === "AccessDenied" || err.$metadata?.httpStatusCode === 403) {
      return new ApiError(503, "Server tidak punya izin ke bucket S3. Pastikan EC2 memakai LabInstanceProfile.");
    }
    if (err.name === "CredentialsProviderError") {
      return new ApiError(503, "Kredensial AWS tidak ditemukan. Pasang IAM instance profile (LabInstanceProfile) pada EC2.");
    }
    return new ApiError(502, `Gagal ${verb} foto di penyimpanan.`);
  };

  return {
    async put(path, buffer, contentType) {
      try {
        await s3.send(new PutObjectCommand({
          Bucket, Key: key(path), Body: buffer, ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable", // nama file selalu unik
        }));
      } catch (err) { throw explain(err, "mengunggah"); }
    },
    async remove(path) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket, Key: key(path) }));
      } catch (err) { throw explain(err, "menghapus"); }
    },
  };
}
