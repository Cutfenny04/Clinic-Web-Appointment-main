import { Activity, CalendarDays, HeartPulse, LogIn, Menu, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container nav-wrap">
          <Link className="brand" to="/" onClick={closeMenu}>
            <span className="brand-mark"><HeartPulse size={23} /></span>
            <span>Janji<span className="brand-accent">Care</span></span>
          </Link>
          <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Buka menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
            <NavLink to="/" onClick={closeMenu}>Beranda</NavLink>
            <NavLink to="/dokter" onClick={closeMenu}>Cari Dokter</NavLink>
            <NavLink to="/janji-temu" onClick={closeMenu}>Janji Temu</NavLink>
            <Link className="button button-outline nav-login" to="/login" onClick={closeMenu}><LogIn size={16} /> Masuk</Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand footer-brand" to="/"><span className="brand-mark"><HeartPulse size={20} /></span><span>Janji<span className="brand-accent">Care</span></span></Link>
          <p>Pelayanan kesehatan yang lebih mudah, terjadwal, dan terhubung.</p>
          <span className="copyright">© {new Date().getFullYear()} JanjiCare · Prototype akademik</span>
        </div>
      </footer>
    </div>
  );
}