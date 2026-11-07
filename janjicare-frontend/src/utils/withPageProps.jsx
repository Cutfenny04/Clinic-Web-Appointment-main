import { useAuth } from '../contexts/AuthContext';

/**
 * HOC kompatibilitas untuk halaman hasil migrasi Inertia.
 * Hanya menyuntikkan pengguna yang SEDANG LOGIN (dari backend). Tidak ada data dummy
 * dan tidak ada penggantian identitas berdasarkan URL.
 */
export function withPageProps(Component, customProps = {}) {
  return function WrappedPage(props) {
    const { user } = useAuth();
    return <Component auth={{ user }} {...customProps} {...props} />;
  };
}

export default withPageProps;
