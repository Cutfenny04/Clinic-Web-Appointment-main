import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router-dom";

export default function PlaceholderPage({ title, description }) {
  return <section className="placeholder-section"><div className="placeholder-card"><div className="placeholder-icon"><Construction size={28} /></div><span className="section-kicker">HALAMAN DALAM PENGEMBANGAN</span><h1>{title}</h1><p>{description}</p><p className="demo-note">Ini kerangka navigasi frontend. Fitur data dan aksi belum aktif sampai API backend tersedia.</p><Link className="button button-primary" to="/"><ArrowLeft size={17} /> Kembali ke Beranda</Link></div></section>;
}