import { useEffect, useId, useMemo, useRef, useState } from "react";
import DoctorPhoto from "@/components/shared/DoctorPhoto";
import { Button } from "@/components/ui";
import { ACCEPT_ATTR, validatePhotoFile } from "@/services/doctorPhotos";

/**
 * Input foto profil untuk formulir Tambah/Ubah Dokter.
 * Tidak mengunggah apa pun sendiri — hanya menyimpan pilihan admin:
 *   value = { file: File|null, remove: boolean }
 * Unggahan terjadi saat formulir disimpan (lihat pages/admin/Doctors.jsx).
 */
export default function DoctorPhotoInput({ doctor, currentUrl, value, onChange, busy, error }) {
  const id = useId();
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState(null);
  const preview = useMemo(() => (value?.file ? URL.createObjectURL(value.file) : null), [value?.file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const shownUrl = preview || (value?.remove ? null : currentUrl) || null;
  const hasPhoto = !!shownUrl;

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // agar file yang sama bisa dipilih ulang
    if (!file) return;
    const msg = validatePhotoFile(file);
    setLocalError(msg);
    if (!msg) onChange({ file, remove: false });
  };

  const clear = () => {
    setLocalError(null);
    onChange(value?.file ? { file: null, remove: false } : { file: null, remove: true });
  };

  const status = value?.file ? "Foto baru — akan diunggah saat disimpan."
    : value?.remove ? "Foto akan dihapus saat disimpan."
      : currentUrl ? "Foto saat ini." : "Belum ada foto. Avatar default akan ditampilkan.";

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start">
      <div className="relative w-32 flex-shrink-0">
        <DoctorPhoto doctor={doctor} src={shownUrl} rounded="rounded-lg" className="border border-gray-200 dark:border-slate-700" />
        {busy && (
          <div className="absolute inset-0 rounded-lg bg-white/70 dark:bg-slate-900/70 flex items-center justify-center" role="status">
            <span className="w-6 h-6 border-2 border-mauve-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">Mengunggah foto...</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Foto Profil</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">JPG, JPEG, PNG, atau WebP · maks. 2 MB · disarankan portrait 4:5.</p>
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300" aria-live="polite">{status}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={inputRef} id={id} type="file" accept={ACCEPT_ATTR} className="sr-only" onChange={pick} disabled={busy}
            aria-describedby={`${id}-err`} />
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
            {hasPhoto ? "Ganti Foto" : "Pilih Foto"}
          </Button>
          {(hasPhoto || value?.remove) && (
            value?.remove && !value?.file ? (
              <Button size="sm" variant="ghost" onClick={() => onChange({ file: null, remove: false })} disabled={busy}>Batalkan Hapus</Button>
            ) : (
              <Button size="sm" variant="ghost" className="text-rose-600" onClick={clear} disabled={busy}>
                {value?.file ? "Batalkan Pilihan" : "Hapus Foto"}
              </Button>
            )
          )}
        </div>
        {(localError || error) && <p id={`${id}-err`} role="alert" className="mt-2 text-xs font-semibold text-rose-600">{localError || error}</p>}
      </div>
    </div>
  );
}
