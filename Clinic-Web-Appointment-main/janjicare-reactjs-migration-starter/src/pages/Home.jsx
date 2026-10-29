import { ArrowRight, CalendarCheck, Clock3, HeartPulse, ShieldCheck, Stethoscope, Video } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: CalendarCheck, title: "Janji temu online", text: "Pilih dokter dan jadwal kunjungan tanpa perlu mendaftar langsung di meja klinik." },
  { icon: Clock3, title: "Informasi antrean", text: "Pantau status janji temu dan antrean dari satu tempat." },
  { icon: ShieldCheck, title: "Akses sesuai peran", text: "Pasien, dokter, dan admin memiliki halaman kerja sesuai kebutuhannya." },
  { icon: Video, title: "Konsultasi digital", text: "Ruang untuk pengembangan konsultasi jarak jauh bila layanan backend tersedia." }
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-pattern" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> LAYANAN KLINIK DIGITAL</div>
            <h1>Urus janji kesehatan dengan <span>lebih mudah.</span></h1>
            <p className="hero-description">JanjiCare membantu pasien mengatur janji temu, menemukan dokter, dan memantau informasi kunjungan dalam satu pengalaman yang sederhana.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to="/janji-temu">Buat Janji Temu  </Link>
              <Link className="button button-ghost" to="/dokter"><Stethoscope size={18} /> Lihat Dokter</Link>
            </div>
            <div className="hero-note"><ShieldCheck size={16} /> Prototype untuk demonstrasi sistem klinik</div>
          </div>
          <div className="hero-visual" aria-label="Ilustrasi ringkasan layanan">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="medical-card">
              <div className="medical-card-top"><span className="status-pill"><span /> Layanan terjadwal</span><HeartPulse className="heart-icon" size={23} /></div>
              <div className="medical-illustration"><div className="doctor-avatar"><Stethoscope size={52} /></div><div className="plus-bubble">+</div></div>
              <div className="card-line line-wide" /><div className="card-line line-short" />
              <div className="appointment-mini"><div className="calendar-icon"><CalendarCheck size={20} /></div><div><strong>Janji temu klinik</strong><small>Atur waktu kunjunganmu</small></div><ArrowRight size={17} /></div>
            </div>
            <div className="floating-badge badge-top"><span className="badge-icon"><CalendarCheck size={18} /></span><span><strong>Jadwal praktis</strong><small>Lebih mudah diatur</small></span></div>
            <div className="floating-badge badge-bottom"><span className="online-dot" /><span><strong>Terhubung</strong><small>Pasien dan klinik</small></span></div>
          </div>
        </div>
      </section>
      <section className="trust-strip">
        <div className="container trust-inner"><span><HeartPulse size={19} /> Berorientasi pada pasien</span><span><ShieldCheck size={19} /> Akses berbasis peran</span><span><Clock3 size={19} /> Informasi lebih teratur</span></div>
      </section>
      <section className="features-section" id="fitur">
        <div className="container">
          <div className="section-heading"><span className="section-kicker">FITUR JANJICARE</span><h2>Hal penting dalam satu tempat</h2><p>Fondasi antarmuka yang dapat dikembangkan dan dihubungkan dengan API Express.js.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="feature-card" key={title}><div className="feature-icon"><Icon size={23} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>
      <section className="cta-section"><div className="container cta-inner"><div><span className="section-kicker">MULAI DARI SINI</span><h2>Siap mengatur kunjungan klinik?</h2><p>Mulai dari halaman janji temu. Integrasi data aktif menunggu API backend kelompok.</p></div><Link className="button button-light" to="/janji-temu">Lihat Janji Temu <ArrowRight size={18} /></Link></div></section>
    </>
  );
}