import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import SidebarLayout from "@/layouts/SidebarLayout";
import { useApi } from "@/hooks/useApi";
import { apiService } from "@/services/api";
import { PageHeader, Card, AsyncBlock, DataTable, StatCard, Field, Input, Button } from "@/components/ui";
import { formatDate, formatStatus, todayJakarta, addDays } from "@/utils/format";

export default function AdminReports() {
  const today = todayJakarta();
  const [range, setRange] = useState({ from: addDays(today, -29), to: today });
  const [draft, setDraft] = useState(range);
  const { data, loading, error, reload } = useApi(() => apiService.admin.reports(range), [range.from, range.to]);
  const by = data?.by_status || {};
  const pct = (n) => (data?.total ? `${Math.round((n / data.total) * 100)}%` : "0%");

  return (
    <SidebarLayout>
      <PageHeader title="Laporan" description="Rekap janji temu berdasarkan tanggal jadwal praktik."
        actions={<Button variant="secondary" onClick={() => window.print()} disabled={!data}>Cetak / Simpan PDF</Button>} />
      <Card className="mb-6 print:hidden">
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end" onSubmit={(e) => { e.preventDefault(); if (draft.from <= draft.to) setRange(draft); }}>
          <Field label="Dari tanggal" htmlFor="r-from"><Input id="r-from" type="date" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></Field>
          <Field label="Sampai tanggal" htmlFor="r-to"><Input id="r-to" type="date" value={draft.to} min={draft.from} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></Field>
          <Button type="submit">Tampilkan</Button>
        </form>
      </Card>
      <AsyncBlock loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <p className="mb-4 text-sm text-gray-500">Periode {formatDate(data.from)} – {formatDate(data.to)}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total janji temu" value={data.total} tone="blue" />
              <StatCard label="Selesai" value={by.completed || 0} hint={pct(by.completed || 0)} tone="teal" />
              <StatCard label="Dibatalkan" value={by.cancelled || 0} hint={pct(by.cancelled || 0)} tone="rose" />
              <StatCard label="Belum selesai" value={data.total - (by.completed || 0) - (by.cancelled || 0)} tone="amber" />
            </div>
            <Card title="Janji Temu per Hari" className="mb-6">
              {data.by_day.length ? (
                <div className="h-72" role="img" aria-label="Grafik janji temu per hari">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.by_day.map((d) => ({ ...d, label: formatDate(d.date, { month: "short", year: undefined }) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => [v, { total: "Total", completed: "Selesai", cancelled: "Dibatalkan" }[n] || n]} />
                      <Legend formatter={(n) => ({ total: "Total", completed: "Selesai", cancelled: "Dibatalkan" }[n] || n)} />
                      <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-gray-500">Tidak ada data pada periode ini.</p>}
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Per Dokter">
                <DataTable rowKey="doctor_id" rows={data.by_doctor} columns={[
                  { key: "doctor_name", label: "Dokter" },
                  { key: "total", label: "Total" },
                  { key: "completed", label: "Selesai" },
                ]} />
              </Card>
              <Card title="Per Status">
                <DataTable rowKey="status" rows={Object.entries(by).map(([status, n]) => ({ status, n }))} columns={[
                  { key: "status", label: "Status", render: (r) => formatStatus(r.status) },
                  { key: "n", label: "Jumlah" },
                  { key: "p", label: "Persentase", render: (r) => pct(r.n) },
                ]} />
              </Card>
            </div>
          </>
        )}
      </AsyncBlock>
    </SidebarLayout>
  );
}
