import route from '@/utils/route';
import DangerButton from "@/components/DangerButton";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import Modal from "@/components/Modal";
import SecondaryButton from "@/components/SecondaryButton";
import TextInput from "@/components/TextInput";
import { useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
export default function DeleteUserForm({ className = "" }) {
  const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
  const passwordInput = useRef(null);
  const {
    data,
    setData,
    delete: destroy,
    processing,
    reset,
    errors,
    clearErrors
  } = useForm({
    password: ""
  });
  const confirmUserDeletion = () => {
    setConfirmingUserDeletion(true);
  };
  const deleteUser = (e) => {
    e.preventDefault();
    destroy(route("profile.destroy"), {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onError: () => passwordInput.current?.focus(),
      onFinish: () => reset()
    });
  };
  const closeModal = () => {
    setConfirmingUserDeletion(false);
    clearErrors();
    reset();
  };
  return <section className={`space-y-6 ${className}`}><header><h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Hapus Akun
                </h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Setelah akun Anda dihapus, semua data dan sumber daya akan dihapus secara permanen. Sebelum menghapus, unduh terlebih dahulu data yang ingin Anda simpan.
                </p></header><DangerButton onClick={confirmUserDeletion}>
                Hapus Akun
            </DangerButton><Modal show={confirmingUserDeletion} onClose={closeModal}><form onSubmit={deleteUser} className="p-6 dark:bg-slate-800"><h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        Apakah Anda yakin ingin menghapus akun Anda?
                    </h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Setelah akun Anda dihapus, semua data akan dihapus secara permanen. Masukkan kata sandi Anda untuk mengonfirmasi penghapusan akun.
                    </p><div className="mt-6"><InputLabel
    htmlFor="password"
    value="Kata Sandi"
    className="sr-only"
  /><TextInput
    id="password"
    type="password"
    name="password"
    ref={passwordInput}
    value={data.password}
    onChange={(e) => setData("password", e.target.value)}
    className="mt-1 block w-3/4"
    isFocused
    placeholder="Kata Sandi"
  /><InputError
    message={errors.password}
    className="mt-2"
  /></div><div className="mt-6 flex justify-end"><SecondaryButton onClick={closeModal}>
                            Batal
                        </SecondaryButton><DangerButton className="ms-3" disabled={processing}>
                            Hapus Akun
                        </DangerButton></div></form></Modal></section>;
}
