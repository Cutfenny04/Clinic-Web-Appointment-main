import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { apiService, setSessionExpiredHandler } from "../services/api";

export type Role = "admin" | "doctor" | "patient";

export interface UserProfile {
  id: string;
  name: string;
  full_name: string;
  email: string;
  role: Role;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextType {
  user: UserProfile | null;
  role: Role | null;
  status: Status;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: { email: string; password: string; full_name: string; phone?: string }) => Promise<{ needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
}

export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  admin: "/admin/dashboard",
  doctor: "/doctor/dashboard",
  patient: "/patient/dashboard",
};

const AuthContext = createContext<AuthContextType | null>(null);

function translateSupabaseError(message = ""): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau kata sandi salah.";
  if (m.includes("not confirmed") || m.includes("confirm")) return "Email belum dikonfirmasi. Buka tautan konfirmasi yang dikirim ke email Anda, lalu coba masuk lagi.";
  if (m.includes("disabled")) return "Login dengan email sedang dinonaktifkan di pengaturan Supabase.";
  if (m.includes("rate limit") || m.includes("too many")) return "Terlalu banyak percobaan masuk. Coba lagi nanti.";
  if (m.includes("fetch") || m.includes("network")) return "Tidak dapat terhubung ke layanan autentikasi.";
  return `Gagal masuk: ${message}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [sessionExpired, setSessionExpired] = useState(false);
  const loadingProfile = useRef<Promise<UserProfile | null> | null>(null);

  const clear = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
    // bersihkan sisa penyimpanan mode demo lama
    try {
      localStorage.removeItem("janjicare_user");
      localStorage.removeItem("janjicare_auth_token");
    } catch { /* abaikan */ }
  }, []);

  /** Role SELALU berasal dari backend (/auth/me → tabel profiles), bukan dari browser. */
  const refreshUser = useCallback(async () => {
    if (!loadingProfile.current) {
      loadingProfile.current = (async () => {
        try {
          const res: any = await apiService.auth.me();
          setUser(res.data);
          setStatus("authenticated");
          return res.data as UserProfile;
        } catch (err: any) {
          if (err.status === 401 || err.status === 403) {
            await supabase.auth.signOut().catch(() => {});
            clear();
            if (err.status === 403) throw err;
            return null;
          }
          // server tidak dapat dihubungi: jangan tampilkan data, anggap belum masuk
          clear();
          throw err;
        } finally {
          loadingProfile.current = null;
        }
      })();
    }
    return loadingProfile.current;
  }, [clear]);

  useEffect(() => {
    let mounted = true;
    setSessionExpiredHandler(() => {
      setSessionExpired(true);
      supabase.auth.signOut().catch(() => {});
      clear();
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) await refreshUser().catch(() => {});
      else clear();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clear();
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
      setSessionExpiredHandler(null as any);
    };
  }, [clear, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setSessionExpired(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error(translateSupabaseError(error.message));
    const profile = await refreshUser();
    if (!profile) throw new Error("Profil pengguna tidak ditemukan. Hubungi admin klinik.");
    return profile;
  }, [refreshUser]);

  const register = useCallback(async (payload: { email: string; password: string; full_name: string; phone?: string }) => {
    // Backend memvalidasi input; database memaksa role 'patient' untuk registrasi publik.
    const res: any = await apiService.auth.register(payload);
    const session = res?.data?.session;
    if (session?.access_token) {
      return { needsConfirmation: false };
    }
    return { needsConfirmation: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    clear();
  }, [clear]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    role: user?.role ?? null,
    status,
    isAuthenticated: status === "authenticated" && !!user,
    isLoading: status === "loading",
    sessionExpired,
    login,
    register,
    logout,
    refreshUser,
  }), [user, status, sessionExpired, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}

export default AuthContext;
