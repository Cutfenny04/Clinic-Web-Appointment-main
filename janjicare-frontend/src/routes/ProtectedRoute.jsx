import { Navigate, useLocation } from "react-router-dom";
import { useAuth, DASHBOARD_BY_ROLE } from "../contexts/AuthContext";
import FullPageLoader from "../components/FullPageLoader";

/** Hanya untuk pengguna yang sudah masuk. Belum masuk → /login?next=<halaman tujuan> */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader label="Memeriksa sesi..." />;
  if (status !== "authenticated" || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Sudah masuk + role harus sesuai. Role tidak sesuai → halaman Akses Ditolak (tidak mengganti role). */
export function RoleBasedRoute({ roles, children }) {
  return <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
}

/** Halaman tamu (login/daftar): pengguna yang sudah masuk diarahkan ke dasbornya. */
export function GuestRoute({ children }) {
  const { status, user } = useAuth();
  if (status === "loading") return <FullPageLoader label="Memeriksa sesi..." />;
  if (status === "authenticated" && user) return <Navigate to={DASHBOARD_BY_ROLE[user.role] || "/"} replace />;
  return children;
}

/** /dashboard → dasbor sesuai role */
export function DashboardRedirect() {
  const { status, user } = useAuth();
  if (status === "loading") return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={DASHBOARD_BY_ROLE[user.role]} replace />;
}
