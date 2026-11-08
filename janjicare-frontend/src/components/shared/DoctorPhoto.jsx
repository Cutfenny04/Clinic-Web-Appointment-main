import { useEffect, useState } from "react";
import { cx } from "@/components/ui";
import { getDoctorPhotoUrl } from "@/services/doctorPhotos";
import { initials } from "@/utils/format";

/**
 * Foto profil dokter dengan rasio portrait konsisten (4:5) dan object-fit cover.
 * Bila foto belum ada atau gagal dimuat, tampil avatar default (siluet + inisial).
 *
 * size: "card" (portrait penuh lebar), "lg" (detail), atau "avatar" (lingkaran kecil untuk tabel).
 */
export default function DoctorPhoto({ doctor, src: srcOverride, size = "card", className, rounded = "rounded-lg" }) {
  const src = srcOverride ?? getDoctorPhotoUrl(doctor);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const name = doctor?.name || doctor?.full_name || "dokter";
  const alt = `Foto profil ${name}`;
  const show = src && !failed;

  if (size === "avatar") {
    return show ? (
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
        className={cx("w-10 h-10 rounded-full object-cover object-top bg-mauve-100 flex-shrink-0", className)} />
    ) : (
      <div role="img" aria-label={`${alt} belum tersedia`}
        className={cx("w-10 h-10 rounded-full bg-mauve-100 dark:bg-mauve-800 text-mauve-700 dark:text-mauve-200 font-bold text-xs flex items-center justify-center flex-shrink-0", className)}>
        {initials(name)}
      </div>
    );
  }

  return (
    <div className={cx("relative aspect-[4/5] w-full overflow-hidden bg-heather/60 dark:bg-slate-800", rounded, className)}>
      {show ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-top" />
      ) : (
        <div role="img" aria-label={`${alt} belum tersedia`} className="absolute inset-0 flex flex-col items-center justify-end">
          <svg viewBox="0 0 200 250" className="w-4/5 text-decant/70 dark:text-mauve-600" aria-hidden="true">
            <circle cx="100" cy="92" r="44" fill="currentColor" />
            <path d="M20 250 C24 180 60 150 100 150 C140 150 176 180 180 250Z" fill="currentColor" />
          </svg>
          {/* kepala siluet berada ±49% dari tinggi kotak 4:5 */}
          <span className={cx("absolute -translate-y-1/2 font-serif font-semibold text-white/90 dark:text-mauve-100",
            size === "lg" ? "text-5xl" : "text-3xl")} style={{ top: "49%" }}>{initials(name)}</span>
        </div>
      )}
    </div>
  );
}
