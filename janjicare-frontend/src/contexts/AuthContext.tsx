import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  role: "admin" | "doctor" | "patient";
  phone?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

export const DEMO_USERS: Record<string, UserProfile> = {
  admin: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Administrator JanjiCare",
    full_name: "Administrator JanjiCare",
    email: "admin@janjicare.com",
    role: "admin",
    phone: "+62 812-3456-7890",
  },
  doctor: {
    id: "00000000-0000-0000-0000-000000000002",
    name: "dr. Sarah Jenkins, Sp.A",
    full_name: "dr. Sarah Jenkins, Sp.A",
    email: "doctor@janjicare.com",
    role: "doctor",
    phone: "+62 813-9876-5432",
  },
  patient: {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Budi Santoso",
    full_name: "Budi Santoso",
    email: "patient@janjicare.com",
    role: "patient",
    phone: "+62 856-7890-1234",
  },
};

interface AuthContextType {
  user: UserProfile | null;
  role: "admin" | "doctor" | "patient";
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrRole?: string, password?: string) => Promise<UserProfile>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => Promise<any>;
  logout: () => Promise<void>;
  switchRole: (role: "admin" | "doctor" | "patient") => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("janjicare_user");
      return saved ? JSON.parse(saved) : DEMO_USERS.admin;
    } catch {
      return DEMO_USERS.admin;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("janjicare_auth_token") || "demo_token_123";
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Supabase Auth session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          setToken(session.access_token);
          localStorage.setItem("janjicare_auth_token", session.access_token);

          // Ambil profil dari Supabase table profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, role, created_at")
            .eq("id", session.user.id)
            .single();

          const mappedUser: UserProfile = {
            id: session.user.id,
            email: session.user.email || "",
            name: profile?.full_name || session.user.user_metadata?.full_name || "User JanjiCare",
            full_name: profile?.full_name || session.user.user_metadata?.full_name || "User JanjiCare",
            role: (profile?.role as any) || "patient",
          };

          setUser(mappedUser);
          localStorage.setItem("janjicare_user", JSON.stringify(mappedUser));
        }
      } catch (err) {
        console.warn("[AuthContext] Supabase initSession error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen to Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token);
        localStorage.setItem("janjicare_auth_token", session.access_token);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .eq("id", session.user.id)
          .single();

        const mappedUser: UserProfile = {
          id: session.user.id,
          email: session.user.email || "",
          name: profile?.full_name || session.user.user_metadata?.full_name || "User JanjiCare",
          full_name: profile?.full_name || session.user.user_metadata?.full_name || "User JanjiCare",
          role: (profile?.role as any) || "patient",
        };

        setUser(mappedUser);
        localStorage.setItem("janjicare_user", JSON.stringify(mappedUser));
      } else if (event === "SIGNED_OUT") {
        // Hanya reset jika sebelumnya bukan mode demo statis
        setUser(null);
        setToken(null);
        localStorage.removeItem("janjicare_auth_token");
        localStorage.removeItem("janjicare_user");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (emailOrRole = "admin", password?: string): Promise<UserProfile> => {
    const lower = String(emailOrRole).toLowerCase();

    // Quick demo login support
    if (["admin", "doctor", "patient"].includes(lower) && !password) {
      const targetUser = DEMO_USERS[lower];
      setUser(targetUser);
      const fakeToken = "demo_token_" + Date.now();
      setToken(fakeToken);
      localStorage.setItem("janjicare_auth_token", fakeToken);
      localStorage.setItem("janjicare_user", JSON.stringify(targetUser));
      return targetUser;
    }

    // Real Supabase Auth login
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOrRole,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session) {
        setToken(data.session.access_token);
        localStorage.setItem("janjicare_auth_token", data.session.access_token);

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, role, created_at")
          .eq("id", data.user.id)
          .single();

        const loggedInUser: UserProfile = {
          id: data.user.id,
          email: data.user.email || emailOrRole,
          name: profile?.full_name || "User JanjiCare",
          full_name: profile?.full_name || "User JanjiCare",
          role: (profile?.role as any) || "patient",
        };

        setUser(loggedInUser);
        localStorage.setItem("janjicare_user", JSON.stringify(loggedInUser));
        return loggedInUser;
      }
    }

    // Fallback default
    setUser(DEMO_USERS.admin);
    return DEMO_USERS.admin;
  };

  const register = async ({
    email,
    password,
    full_name,
    phone,
  }: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone: phone || null,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem("janjicare_auth_token");
    localStorage.removeItem("janjicare_user");
  };

  const switchRole = (newRole: "admin" | "doctor" | "patient") => {
    if (DEMO_USERS[newRole]) {
      setUser(DEMO_USERS[newRole]);
      localStorage.setItem("janjicare_user", JSON.stringify(DEMO_USERS[newRole]));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || DEMO_USERS.admin,
        role: user?.role || "admin",
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return (
    context || {
      user: DEMO_USERS.admin,
      role: "admin",
      token: "demo_token_123",
      isAuthenticated: true,
      isLoading: false,
      login: async () => DEMO_USERS.admin,
      register: async () => {},
      logout: async () => {},
      switchRole: () => {},
    }
  );
}

export default AuthContext;
