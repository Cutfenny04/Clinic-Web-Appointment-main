import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { Button, EmptyState, ErrorState, LoadingState, SearchInput, cx } from "@/components/ui";
import Modal from "@/components/Modal";
import DoctorPhoto from "@/components/shared/DoctorPhoto";
import { initials } from "@/utils/format";
import toast from "@/lib/toast";

/**
 * Halaman Pesan (pasien, dokter, admin).
 *  - Pasien  : chat dengan dokter yang pernah ditemui + "Admin Klinik" (kotak masuk bersama)
 *  - Dokter  : chat dengan pasiennya
 *  - Admin   : kotak masuk bersama dari pasien (TIDAK bisa melihat chat dokter–pasien)
 * Pesan baru diambil berkala (polling) — tidak mengubah alur booking/antrean.
 */
const MAX = 2000;
const TZ = "Asia/Jakarta";
const fmtTime = (iso) => new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
function fmtDay(iso) {
  const k = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yest = dayKey(new Date(Date.now() - 86400000).toISOString());
  if (k === today) return "Hari ini";
  if (k === yest) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
function fmtListTime(iso) {
  if (!iso) return "";
  return dayKey(iso) === dayKey(new Date().toISOString())
    ? fmtTime(iso)
    : new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(iso));
}
const notifyUnreadChanged = () => window.dispatchEvent(new Event("chat:unread-changed"));

/** setInterval yang berhenti saat tab tidak terlihat */
function usePolling(fn, ms, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => { if (document.visibilityState === "visible") ref.current(); }, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

function Avatar({ conv, size = "w-10 h-10" }) {
  if (conv?.photo_url) {
    return <DoctorPhoto doctor={{ name: conv.title, photo_url: conv.photo_url }} size="avatar" className={size} />;
  }
  const isAdmin = conv?.kind === "admin" && conv?.title === "Admin Klinik";
  return (
    <div className={cx(size, "rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs",
      isAdmin ? "bg-plum text-white" : "bg-mauve-100 text-mauve-700 dark:bg-mauve-800 dark:text-mauve-200")} aria-hidden="true">
      {isAdmin ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
      ) : initials(conv?.title || "?")}
    </div>
  );
}

function NewChatModal({ open, onClose, role, onPick }) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState({ loading: true, error: null, data: [] });
  const load = useCallback(async (q) => {
    setState((s) => ({ ...s, loading: true }));
    try { setState({ loading: false, error: null, data: (await apiService.chat.contacts(q)).data || [] }); }
    catch (e) { setState({ loading: false, error: e, data: [] }); }
  }, []);
  useEffect(() => { if (open) { setSearch(""); load(""); } }, [open, load]);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, open, load]);

  const title = role === "patient" ? "Chat dengan Dokter" : "Mulai Chat dengan Pasien";
  const emptyText = role === "patient"
    ? "Chat dengan dokter tersedia setelah Anda membuat janji temu dengan dokter tersebut. Untuk pertanyaan umum, hubungi Admin Klinik."
    : role === "doctor" ? "Belum ada pasien yang pernah membuat janji temu dengan Anda." : "Pasien tidak ditemukan.";

  return (
    <Modal show={open} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {role === "patient" ? "Hanya dokter yang pernah Anda temui yang dapat dihubungi." : role === "doctor" ? "Hanya pasien yang pernah membuat janji temu dengan Anda." : "Pesan akan masuk ke kotak masuk bersama admin."}
        </p>
        <div className="mt-4">
          <SearchInput id="chat-search" className="" value={search} onChange={setSearch} placeholder="Cari nama" />
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto -mx-2">
          {state.loading ? <LoadingState rows={3} /> : state.error ? <ErrorState error={state.error} onRetry={() => load(search)} />
            : !state.data.length ? <p className="px-2 py-6 text-sm text-center text-gray-500">{emptyText}</p>
              : (
                <ul>
                  {state.data.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => onPick(c)}
                        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-left hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-mauve-400">
                        <Avatar conv={{ title: c.name, photo_url: c.photo_url }} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-sm text-gray-900 dark:text-white truncate">{c.name}</span>
                          <span className="block text-xs text-gray-500 truncate">{c.specialty || (c.role === "patient" ? "Pasien" : "")}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
        </div>
        <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={onClose}>Tutup</Button></div>
      </div>
    </Modal>
  );
}

function Thread({ conv, role, onBack, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const endRef = useRef(null);
  const listRef = useRef(null);

  const scrollToEnd = (smooth = false) => endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });

  const fetchNew = useCallback(async ({ initial = false } = {}) => {
    try {
      const res = await apiService.chat.messages(conv.id, initial ? 0 : lastId.current);
      const fresh = res.data || [];
      if (initial) setMessages(fresh);
      else if (fresh.length) setMessages((m) => [...m, ...fresh.filter((x) => !m.some((y) => y.id === x.id))]);
      if (fresh.length) {
        lastId.current = fresh[fresh.length - 1].id;
        if (fresh.some((m) => !m.mine) || initial) {
          await apiService.chat.markRead(conv.id).catch(() => {});
          notifyUnreadChanged();
        }
      }
      setError(null);
      return fresh.length;
    } catch (e) {
      if (initial) setError(e);
      return 0;
    } finally {
      if (initial) setLoading(false);
    }
  }, [conv.id]);

  useEffect(() => {
    lastId.current = 0; setLoading(true); setMessages([]); setText("");
    fetchNew({ initial: true });
  }, [conv.id, fetchNew]);
  useEffect(() => { scrollToEnd(messages.length > 0 && !loading); }, [messages.length, loading]);
  usePolling(() => fetchNew(), 4000);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (body.length > MAX) { toast.error(`Pesan maksimal ${MAX} karakter.`); return; }
    setSending(true);
    try {
      const res = await apiService.chat.send(conv.id, body);
      setText("");
      setMessages((m) => (m.some((x) => x.id === res.data.id) ? m : [...m, res.data]));
      lastId.current = Math.max(lastId.current, res.data.id);
      onSent?.();
    } catch (err) {
      toast.error(err.message || "Gagal mengirim pesan.");
    } finally { setSending(false); }
  };

  const grouped = useMemo(() => {
    const out = [];
    let prev = null;
    for (const m of messages) {
      const k = dayKey(m.created_at);
      if (k !== prev) { out.push({ day: m.created_at, key: `d-${k}` }); prev = k; }
      out.push(m);
    }
    return out;
  }, [messages]);

  const showSender = role === "patient" && conv.kind === "admin"; // pasien melihat nama admin yang membalas

  return (
    <section className="flex flex-col min-h-0 h-full" aria-label={`Percakapan dengan ${conv.title}`}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <button type="button" onClick={onBack} className="md:hidden -ml-1 p-1.5 rounded-md text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Kembali ke daftar percakapan">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <Avatar conv={conv} />
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">{conv.title}</h2>
          {conv.subtitle && <p className="text-xs text-gray-500 truncate">{conv.subtitle}</p>}
        </div>
      </header>

      {conv.kind === "doctor" && (
        <p className="px-4 py-2 text-xs bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 border-b border-amber-100 dark:border-amber-900/40" role="note">
          Chat bukan pengganti pemeriksaan langsung. Untuk keadaan darurat, segera ke IGD terdekat.
        </p>
      )}

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 bg-cream/40 dark:bg-slate-950/40" aria-live="polite">
        {loading ? <LoadingState rows={3} label="Memuat pesan..." /> : error ? <ErrorState error={error} onRetry={() => fetchNew({ initial: true })} />
          : !messages.length ? (
            <p className="text-center text-sm text-gray-500 py-10">Belum ada pesan. Mulai percakapan dengan menulis pesan di bawah.</p>
          ) : grouped.map((m) => (m.day ? (
            <div key={m.key} className="flex justify-center py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 bg-white/80 dark:bg-slate-900/80 px-2.5 py-0.5 rounded-full">{fmtDay(m.day)}</span>
            </div>
          ) : (
            <div key={m.id} className={cx("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[80%] rounded-lg px-3.5 py-2 text-sm shadow-sm",
                m.mine ? "bg-plum text-white rounded-br-sm" : "bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-bl-sm")}>
                {!m.mine && showSender && m.sender_name && <p className="text-[11px] font-semibold text-mauve-600 dark:text-mauve-300 mb-0.5">{m.sender_name} · Admin</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cx("mt-1 text-[10px] text-right", m.mine ? "text-white/70" : "text-gray-400")}>{fmtTime(m.created_at)}</p>
              </div>
            </div>
          )))}
        <div ref={endRef} />
      </div>

      {conv.can_send ? (
        <form onSubmit={send} className="border-t border-gray-100 dark:border-slate-800 p-3 flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">Tulis pesan</label>
          <textarea id="chat-input" rows={1} value={text} maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e); }}
            placeholder="Tulis pesan…" aria-describedby="chat-hint"
            className="flex-1 resize-none max-h-32 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mauve-400" />
          <Button type="submit" loading={sending} disabled={!text.trim() || sending}>Kirim</Button>
        </form>
      ) : (
        <p className="border-t border-gray-100 dark:border-slate-800 p-4 text-sm text-gray-500 text-center">
          Chat ditutup karena tidak ada lagi janji temu aktif dengan dokter ini.
        </p>
      )}
      <p id="chat-hint" className="px-4 pb-2 -mt-1 flex justify-between text-[11px] text-gray-400">
        <span className="hidden sm:inline">Enter untuk kirim · Shift+Enter untuk baris baru</span>
        {text.length > MAX - 200 && <span className="ml-auto">{text.length}/{MAX}</span>}
      </p>
    </section>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const role = user?.role;
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("c");
  const [convs, setConvs] = useState(null);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(false);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    try { setConvs((await apiService.chat.conversations()).data || []); setError(null); }
    catch (e) { setError(e); }
  }, []);
  useEffect(() => { load(); }, [load]);
  usePolling(load, 8000);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("chat:unread-changed", h);
    return () => window.removeEventListener("chat:unread-changed", h);
  }, [load]);

  const select = (id) => setParams(id ? { c: id } : {}, { replace: false });
  const open = async (kind, otherId) => {
    setOpening(true);
    try {
      const res = await apiService.chat.start(kind, otherId);
      setPicker(false);
      await load();
      select(res.data.id);
    } catch (e) { toast.error(e.message || "Gagal membuka percakapan."); }
    finally { setOpening(false); }
  };

  const hasAdminConv = convs?.some((c) => c.kind === "admin");
  const selected = convs?.find((c) => c.id === selectedId) || null;
  const listTitle = role === "admin" ? "Kotak Masuk Pasien" : "Percakapan";

  return (
    <SidebarLayout>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gray-900 dark:text-white">Pesan</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {role === "patient" && "Tanyakan jadwal & biaya ke Admin Klinik, atau keluhan Anda ke dokter yang pernah Anda temui."}
            {role === "doctor" && "Percakapan dengan pasien Anda. Admin tidak dapat membaca percakapan ini."}
            {role === "admin" && "Kotak masuk bersama untuk pertanyaan pasien. Chat dokter–pasien bersifat privat dan tidak tampil di sini."}
          </p>
        </div>
        <Button onClick={() => setPicker(true)}>{role === "patient" ? "+ Chat Dokter" : "+ Pesan Baru"}</Button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden grid md:grid-cols-[320px_1fr] h-[calc(100vh-14rem)] min-h-[420px]">
        <aside className={cx("min-h-0 flex flex-col border-r border-gray-100 dark:border-slate-800", selected ? "hidden md:flex" : "flex")} aria-label="Daftar percakapan">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{listTitle}</p>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {role === "patient" && convs && !hasAdminConv && (
              <button type="button" disabled={opening} onClick={() => open("admin")}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 border-b border-gray-50 dark:border-slate-800">
                <Avatar conv={{ kind: "admin", title: "Admin Klinik" }} />
                <span className="min-w-0">
                  <span className="block font-semibold text-sm text-gray-900 dark:text-white">Admin Klinik</span>
                  <span className="block text-xs text-gray-500">Tanya jadwal, biaya & cara booking</span>
                </span>
              </button>
            )}
            {!convs && !error ? <LoadingState rows={4} label="Memuat percakapan..." />
              : error ? <ErrorState error={error} onRetry={load} />
                : !convs.length && role !== "patient" ? (
                  <EmptyState title="Belum ada percakapan" description={role === "admin" ? "Pertanyaan pasien akan muncul di sini." : "Pesan dari pasien Anda akan muncul di sini."} />
                ) : (
                  <ul>
                    {convs.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => select(c.id)} aria-current={c.id === selectedId ? "true" : undefined}
                          className={cx("w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 dark:border-slate-800 transition-colors",
                            c.id === selectedId ? "bg-heather/50 dark:bg-mauve-900/30" : "hover:bg-gray-50 dark:hover:bg-slate-800")}>
                          <Avatar conv={c} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={cx("truncate text-sm text-gray-900 dark:text-white", c.unread_count ? "font-bold" : "font-semibold")}>{c.title}</span>
                              <span className="flex-shrink-0 text-[11px] text-gray-400">{fmtListTime(c.last_message_at)}</span>
                            </span>
                            <span className="flex items-center justify-between gap-2">
                              <span className={cx("truncate text-xs", c.unread_count ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-gray-500")}>
                                {c.last_message ? `${c.last_message_mine ? "Anda: " : ""}${c.last_message}` : (c.subtitle || "Belum ada pesan")}
                              </span>
                              {c.unread_count > 0 && (
                                <span className="flex-shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-plum text-white text-[11px] font-bold flex items-center justify-center" aria-label={`${c.unread_count} pesan belum dibaca`}>
                                  {c.unread_count > 99 ? "99+" : c.unread_count}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
          </div>
        </aside>

        <div className={cx("min-h-0", selected ? "flex flex-col" : "hidden md:flex md:flex-col")}>
          {selected ? (
            <Thread key={selected.id} conv={selected} role={role} onBack={() => select(null)} onSent={load} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState title="Pilih percakapan" description={role === "patient" ? "Pilih Admin Klinik atau dokter di sebelah kiri." : "Pilih percakapan di sebelah kiri untuk membaca dan membalas."} />
            </div>
          )}
        </div>
      </div>

      <NewChatModal open={picker} onClose={() => setPicker(false)} role={role}
        onPick={(c) => open(role === "admin" ? "admin" : "doctor", c.id)} />
    </SidebarLayout>
  );
}
