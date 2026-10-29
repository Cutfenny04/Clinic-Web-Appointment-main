import { useState } from "react";
import { HeartPulse, LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    window.alert("Form login masih berupa UI. Integrasi autentikasi dilakukan setelah endpoint Express disepakati.");
  }

  return <section className="form-section"><div className="form-card"><div className="form-brand"><span className="brand-mark"><HeartPulse /></span><span>Janji<span className="brand-accent">Care</span></span></div><span className="section-kicker">SELAMAT DATANG KEMBALI</span><h1>Masuk ke akunmu</h1><p className="form-intro">Gunakan akun JanjiCare untuk melanjutkan.</p><form onSubmit={handleSubmit}><label htmlFor="email">Email</label><div className="input-wrap"><Mail size={18}/><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" required /></div><label htmlFor="password">Kata sandi</label><div className="input-wrap"><LockKeyhole size={18}/><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Masukkan kata sandi" required /></div><button className="button button-primary button-full" type="submit">Masuk</button></form><p className="form-bottom">Belum punya akun? <Link to="/register">Daftar di sini</Link></p><p className="demo-note">Catatan: autentikasi belum terhubung ke backend.</p></div></section>;
}