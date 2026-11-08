import { useEffect, useState, useRef } from "react";
import Head from "@/components/Head";
import { BrandMark } from "@/components/Brand";
import { apiService } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
export default function QueueTV() {
  const [queueData, setQueueData] = useState([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [flashingDoctorId, setFlashingDoctorId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const previousQueueDataRef = useRef([]);
  const playDing = (ctx) => {
    try {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain1.gain.setValueAtTime(0.8, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.8);
      gain2.gain.setValueAtTime(0.8, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.3);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };
  // Data antrean dari Backend API (/queue/display) — publik, tanpa nama lengkap pasien.
  // Polling 5 detik: portabel ke AWS tanpa bergantung pada Supabase Realtime.
  const [loadError, setLoadError] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await apiService.queue.display();
        if (!alive) return;
        setQueueData(
          (res.data?.doctors || [])
            .filter((d) => d.current || d.waiting.length)
            .map((d) => ({
              doctor: { id: d.doctor_id, user: { name: d.doctor_name }, specialty: { name: d.doctor_specialty || "Dokter Umum" } },
              currently_serving: d.current ? { id: d.current.id, appointment_number: d.current.queue_code } : null,
              waiting: d.waiting.map((w) => ({ id: w.id, appointment_number: w.queue_code })),
            }))
        );
        setLoadError(null);
      } catch (e) {
        if (alive) setLoadError(e.message);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { alive = false; clearInterval(interval); };
  }, []);
  useEffect(() => {
    if (!hasStarted || !audioContext) return;
    let newPatientCalled = false;
    let newlyCalledDoctorId = null;
    queueData.forEach((currentDoc) => {
      const prevDoc = previousQueueDataRef.current?.find((d) => d.doctor.id === currentDoc.doctor.id);
      const currentServingId = currentDoc.currently_serving?.id;
      const prevServingId = prevDoc?.currently_serving?.id;
      if (currentServingId && currentServingId !== prevServingId) {
        newPatientCalled = true;
        newlyCalledDoctorId = currentDoc.doctor.id;
      }
    });
    if (newPatientCalled && newlyCalledDoctorId) {
      playDing(audioContext);
      setFlashingDoctorId(newlyCalledDoctorId);
      setTimeout(() => {
        setFlashingDoctorId((prev) => prev === newlyCalledDoctorId ? null : prev);
      }, 5e3);
    }
    previousQueueDataRef.current = queueData;
  }, [queueData, hasStarted, audioContext]);
  const currentTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  if (!hasStarted) {
    return <div className={`min-h-screen ${isDarkMode ? "dark bg-slate-900" : "bg-gray-50"} flex flex-col items-center justify-center transition-all duration-500 p-8 relative`}><Head title="Mulai Tampilan TV" />{
      /* Hidden Theme Toggle (Top Right Corner) */
    }<button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="absolute top-0 right-0 w-24 h-24 opacity-0 cursor-pointer z-50"
      title="Ganti Tema"
    /><h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 md:mb-6 text-center tracking-tight transition-all ${isDarkMode ? "text-white" : "text-slate-900"}`}>Tampilan Antrean Langsung</h1><p className={`text-base sm:text-lg md:text-xl mb-8 md:mb-12 text-center max-w-lg leading-relaxed px-4 transition-all ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Kebijakan keamanan browser memerlukan klik manual untuk mengaktifkan sistem audio.
                </p><button
      onClick={() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(ctx);
        setHasStarted(true);
      }}
      className="px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 bg-blue-700 text-white rounded-xl md:rounded-2xl font-black text-lg sm:text-xl md:text-2xl transition-all z-10"
    >
                    Mulai Mode Tampilan TV
                </button></div>;
  }
  return <div className={`min-h-screen font-sans overflow-hidden flex flex-col transition-all duration-500 ${isDarkMode ? "dark bg-slate-900 text-white" : "bg-gray-100 text-slate-900"} relative`}><Head title="Ruang Tunggu Langsung" /><style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            ` }} />{
    /* Hidden Theme Toggle (Top Right Corner of the Header) */
  }<button
    onClick={() => setIsDarkMode(!isDarkMode)}
    className="absolute top-0 right-0 w-32 h-32 opacity-0 cursor-pointer z-50"
    title="Ganti Tema"
  />{
    /* Header */
  }<div className={`backdrop-blur-md border-b p-3 sm:p-4 md:p-6 flex flex-row justify-between items-center shadow-lg transition-all duration-500 ${isDarkMode ? "bg-slate-800/80 border-slate-700" : "bg-white/80 border-gray-200"}`}><div className="flex items-center gap-3 md:gap-6 ml-1 md:ml-4"><BrandMark size={56} className="hidden sm:inline-flex !text-3xl" /><div><h1 className={`text-lg sm:text-2xl md:text-4xl font-bold tracking-tight text-left ${isDarkMode ? "text-white" : "text-slate-900"}`}>Antrean Klinik Langsung</h1><p className={`text-xs sm:text-sm md:text-lg mt-0.5 md:mt-1 flex items-center justify-start gap-1.5 md:gap-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}><span className="w-1.5 h-1.5 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse" />
                            Pembaruan Langsung Aktif
                        </p></div></div><div className={`text-xl sm:text-3xl md:text-5xl font-bold tracking-tighter tabular-nums py-0 md:py-4 mr-1 md:mr-4 z-10 pointer-events-none ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{currentTime}</div></div>{
    /* Main Content */
  }<div className="flex-1 p-4 md:p-8 flex flex-col relative z-10">{queueData.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-center px-4"><h2 className={`text-2xl md:text-4xl font-bold ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{loadError ? "Data Antrean Tidak Tersedia" : "Ruang Tunggu Kosong"}</h2><p className={`text-base md:text-xl mt-4 ${isDarkMode ? "text-slate-600" : "text-slate-500"}`}>{loadError ? `${loadError} Mencoba lagi otomatis...` : "Belum ada pasien yang check-in saat ini."}</p></div> : <div className="w-full h-full flex flex-col gap-4"><div className="flex-1 flex flex-col gap-3 md:gap-4 content-start overflow-hidden pb-4 px-1 md:px-2 pt-2"><AnimatePresence mode="popLayout">{queueData.map((data) => {
    if (!data.currently_serving && (!data.waiting || data.waiting.length === 0)) return null;
    const currentNumber = data.currently_serving ? data.currently_serving.appointment_number : data.waiting[0]?.appointment_number;
    const isWaiting = !data.currently_serving;
    const isFlashing = flashingDoctorId === data.doctor.id;
    return <motion.div
      key={data.doctor.id}
      layout
      initial={{ opacity: 0, x: -100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, x: 100 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`flex rounded-xl md:rounded-2xl border shadow-lg overflow-hidden transition-all duration-300 h-20 md:h-24 ${isFlashing ? "bg-emerald-100 border-emerald-400 dark:bg-emerald-900 dark:border-emerald-500 animate-[pulse_1s_infinite]" : isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}
    >{
      /* Number Side */
    }<div className={`w-1/3 md:w-1/4 border-r flex flex-col items-center justify-center p-1 md:p-2 relative transition-all duration-300 ${isFlashing ? "bg-emerald-200/50 border-emerald-300/50 dark:bg-emerald-800/50 dark:border-emerald-500/50" : isDarkMode ? "bg-slate-900/50 border-slate-700" : "bg-gray-50 border-gray-200"}`}><span className={`text-[9px] md:text-[10px] capitalize font-bold tracking-widest absolute top-1 md:top-2 transition-all duration-300 ${isFlashing ? "text-emerald-700 dark:text-emerald-200" : isDarkMode ? "text-slate-500" : "text-gray-400"}`}>Tiket</span><span className={`text-4xl md:text-5xl mt-2 md:mt-3 font-black tracking-tighter tabular-nums transition-all duration-300 ${isFlashing ? "text-emerald-900 dark:text-white" : isWaiting ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                    {currentNumber}</span></div>{
      /* Room / Doctor Side */
    }<div className="w-2/3 md:w-3/4 flex flex-col md:flex-row items-start md:items-center justify-center md:justify-between px-4 md:px-6 gap-1 md:gap-0 overflow-hidden"><h2 className={`text-xl md:text-3xl font-extrabold truncate w-full md:w-auto transition-all duration-300 ${isFlashing ? "text-emerald-900 dark:text-white" : isDarkMode ? "text-white" : "text-slate-800"}`}>{data.doctor.user.name}</h2><p className={`text-[10px] md:text-sm font-bold capitalize tracking-widest px-2 py-1 md:px-4 md:py-1.5 rounded-lg border truncate transition-all duration-300 ${isFlashing ? "bg-emerald-500/20 text-emerald-800 border-emerald-400/50 dark:text-emerald-100 dark:border-emerald-400/30" : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"}`}>{data.doctor.specialty.name}</p></div></motion.div>;
  })}</AnimatePresence></div></div>}</div>{
    /* Ticker / Marquee footer */
  }<div className="bg-blue-600 text-white py-3 overflow-hidden whitespace-nowrap shadow-sm mt-auto border-t border-blue-700 z-10 relative"><div className="inline-block animate-[marquee_40s_linear_infinite]"><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Selamat datang di Klinik JanjiCare! Mohon tunggu hingga nomor Anda dipanggil.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Pastikan ponsel Anda dalam mode senyap.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Siapkan kartu berobat atau KTP Anda untuk verifikasi.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Jika mengalami gejala parah, segera beritahu resepsionis.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Pasien tanpa janji temu diterima berdasarkan ketersediaan dokter.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Penggunaan masker sangat dianjurkan di dalam area klinik.</span>{
    /* Duplicate the text to make the loop seamless */
  }<span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Selamat datang di Klinik JanjiCare! Mohon tunggu hingga nomor Anda dipanggil.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Pastikan ponsel Anda dalam mode senyap.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Siapkan kartu berobat atau KTP Anda untuk verifikasi.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Jika mengalami gejala parah, segera beritahu resepsionis.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Pasien tanpa janji temu diterima berdasarkan ketersediaan dokter.</span><span className="text-sm sm:text-base md:text-xl font-medium tracking-wide mx-4 sm:mx-10">Penggunaan masker sangat dianjurkan di dalam area klinik.</span></div></div></div>;
}
