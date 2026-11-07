import route from '@/utils/route';
import { useRef, useState } from "react";
import DangerButton from "@/components/DangerButton";
import InputError from "@/components/InputError";
import InputLabel from "@/components/InputLabel";
import Modal from "@/components/Modal";
import SecondaryButton from "@/components/SecondaryButton";
import TextInput from "@/components/TextInput";
import { useForm } from "@inertiajs/react";
export default function LogoutOtherBrowserSessionsForm({ sessions, className = "" }) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState(null);
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
  const confirmLogout = (sessionId = null) => {
    setTargetSessionId(sessionId);
    setConfirmingLogout(true);
  };
  const logoutBrowserSessions = (e) => {
    e.preventDefault();
    const logoutRoute = targetSessionId ? route("profile.sessions.destroySpecific", { id: targetSessionId }) : route("profile.sessions.destroy");
    destroy(logoutRoute, {
      preserveScroll: true,
      onSuccess: () => closeModal(),
      onError: () => passwordInput.current?.focus(),
      onFinish: () => reset()
    });
  };
  const closeModal = () => {
    setConfirmingLogout(false);
    setTargetSessionId(null);
    clearErrors();
    reset();
  };
  return <section className={className}><header><h2 className="text-lg font-medium text-gray-900 dark:text-white">Sesi Peramban</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Kelola dan keluar dari sesi aktif di peramban dan perangkat lain.
                </p></header><div className="max-w-xl mt-6 text-sm text-gray-600 dark:text-gray-400">
                Jika diperlukan, Anda dapat keluar dari semua sesi peramban lain di seluruh perangkat Anda. Beberapa sesi terbaru tercantum di bawah, namun daftar ini mungkin tidak lengkap. Jika akun Anda dirasa telah disusupi, perbarui kata sandi Anda.
            </div>{sessions.length > 0 && <div className="mt-5 space-y-6">{sessions.map((session, i) => <div key={i} className="flex items-center justify-between"><div className="flex items-center"><div>{session.agent.is_desktop ? <svg fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-gray-500"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> : <svg fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-gray-500"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}</div><div className="ml-3"><div className="text-sm text-gray-600 dark:text-gray-300">{session.agent.platform ? session.agent.platform : "Tidak Diketahui"} - {session.agent.browser ? session.agent.browser : "Tidak Diketahui"}</div><div><div className="text-xs text-gray-500 dark:text-gray-400">{session.ip_address},

                                            {session.is_current_device ? <span className="text-green-500 font-semibold ml-1">Perangkat ini</span> : <span className="ml-1">Terakhir aktif {session.last_active}</span>}</div></div></div></div>{!session.is_current_device && <button
    className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
    onClick={() => confirmLogout(session.id)}
  >
                                    Keluar
                                </button>}</div>)}</div>}<div className="flex items-center mt-5"><DangerButton onClick={() => confirmLogout()}>
                    Keluar dari Sesi Lain
                </DangerButton></div><Modal show={confirmingLogout} onClose={closeModal}><form onSubmit={logoutBrowserSessions} className="p-6 dark:bg-slate-800"><h2 className="text-lg font-medium text-gray-900 dark:text-white">{targetSessionId ? "Apakah Anda yakin ingin keluar dari sesi ini?" : "Apakah Anda yakin ingin keluar dari sesi peramban lain?"}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{targetSessionId ? "Masukkan kata sandi Anda untuk mengonfirmasi bahwa Anda ingin keluar dari sesi ini." : "Masukkan kata sandi Anda untuk mengonfirmasi bahwa Anda ingin keluar dari semua sesi peramban lain di seluruh perangkat."}</p><div className="mt-6"><InputLabel htmlFor="password" value="Kata Sandi" className="sr-only" /><TextInput
    id="password"
    type="password"
    name="password"
    ref={passwordInput}
    value={data.password}
    onChange={(e) => setData("password", e.target.value)}
    className="mt-1 block w-3/4"
    isFocused
    placeholder="Kata Sandi"
  /><InputError message={errors.password} className="mt-2" /></div><div className="mt-6 flex justify-end"><SecondaryButton onClick={closeModal}>Batal</SecondaryButton><DangerButton className="ms-3" disabled={processing}>{targetSessionId ? "Keluar dari Sesi" : "Keluar dari Sesi Lain"}</DangerButton></div></form></Modal></section>;
}
