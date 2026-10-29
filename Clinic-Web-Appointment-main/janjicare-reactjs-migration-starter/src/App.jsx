import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<PlaceholderPage title="Daftar Akun" description="Form registrasi akan dihubungkan ke API Express setelah kontrak backend tersedia." />} />
        <Route path="/dokter" element={<PlaceholderPage title="Daftar Dokter" description="Halaman daftar dokter. Data akan dimuat dari API backend." />} />
        <Route path="/janji-temu" element={<PlaceholderPage title="Buat Janji Temu" description="Pemilihan dokter, jadwal, dan konfirmasi booking akan dihubungkan ke API backend." />} />
        <Route path="/pasien/dashboard" element={<PlaceholderPage title="Dashboard Pasien" description="Ringkasan janji temu dan antrean pasien." />} />
        <Route path="/dokter/dashboard" element={<PlaceholderPage title="Dashboard Dokter" description="Jadwal praktik dan daftar janji temu dokter." />} />
        <Route path="/admin/dashboard" element={<PlaceholderPage title="Dashboard Admin" description="Pengelolaan dokter, pasien, jadwal, dan laporan." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}