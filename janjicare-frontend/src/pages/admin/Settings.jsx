import { Link } from "react-router-dom";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { API_BASE_URL } from "@/services/api";
import { PageHeader, Card, StatusBadge, Button } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/shared/ProfileSettings";
import { formatDateTime } from "@/utils/format";

async function checkHealth() {
  const base = API_BASE_URL.replace(/\/v1\/?$/, "");
  const [api, queue] = await Promise.allSettled([
    fetch(`${base}/health`).then((r) => (r.ok ? r.json() : Promise.reject())),
    fetch(`${API_BASE_URL}/queue/display`).then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b)))),
  ]);
  return {
    data: {
      api: api.status === "fulfilled", apiTime: api.value?.timestamp, env: api.value?.environment,
      queue: queue.status === "fulfilled", queueMsg: queue.reason?.message,
    },
  };
}

export default function AdminSettings() {
  const health = useApi(checkHealth, []);
  const h = health.data || {};
  return (
    <SidebarLayout>
      <PageHeader title="Pengaturan" description="Akun admin dan status layanan klinik." />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6"><ProfileForm /><PasswordForm /></div>
        <div className="space-y-6">
          <Card title="Status Layanan" actions={<Button size="sm" variant="secondary" loading={health.loading} onClick={() => health.reload()}>Periksa Ulang</Button>}>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between items-center"><span>Backend API</span>
                <StatusBadge status={h.api ? "active" : "skipped"} label={health.loading ? "Memeriksa..." : h.api ? "Berjalan" : "Tidak terhubung"} /></li>
              <li className="flex justify-between items-center"><span>Layanan Antrean</span>
                <StatusBadge status={h.queue ? "active" : "skipped"} label={health.loading ? "Memeriksa..." : h.queue ? "Berjalan" : "Tidak terhubung"} /></li>
              {h.queueMsg && <li className="text-xs text-rose-600">{h.queueMsg}</li>}
              {h.apiTime && <li className="text-xs text-gray-500">Waktu server: {formatDateTime(h.apiTime)} · Lingkungan: {h.env}</li>}
            </ul>
          </Card>
          <Card title="Layar Antrean (TV)">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tampilkan di monitor ruang tunggu. Halaman ini publik dan hanya menampilkan nomor antrean serta inisial pasien.</p>
            <Link to="/queue/tv" target="_blank" className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md">Buka Layar TV</Link>
          </Card>
          <Card title="Akun Staf">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Akun dokter dibuat dari menu <Link to="/admin/doctors" className="font-bold text-blue-600 hover:underline">Data Dokter</Link>.
              Akun admin baru dibuat oleh pengelola sistem dengan skrip <code className="px-1 rounded bg-gray-100 dark:bg-slate-700">backend/scripts/create-staff-user.js</code>.
            </p>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
