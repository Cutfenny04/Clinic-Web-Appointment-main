import { Head, Link } from "@inertiajs/react";
export default function ErrorPage({ status }) {
  const title = {
    503: "Layanan Tidak Tersedia",
    500: "Terjadi Kesalahan Server",
    404: "Halaman Tidak Ditemukan",
    403: "Akses Ditolak",
    405: "Metode Tidak Diizinkan",
    419: "Sesi Kedaluwarsa",
    429: "Terlalu Banyak Permintaan"
  };
  const description = {
    503: "Maaf, kami sedang melakukan pemeliharaan sistem. Silakan periksa kembali beberapa saat lagi.",
    500: "Maaf, terjadi kendala pada server kami. Tim teknis sedang memperbaikinya.",
    404: "Maaf, halaman JanjiCare yang Anda cari tidak ditemukan. Tautan mungkin rusak atau telah dipindahkan.",
    403: "Maaf, Anda tidak memiliki hak akses untuk membuka halaman ini.",
    405: "Tindakan yang Anda minta tidak didukung oleh sistem untuk alamat URL ini.",
    419: "Sesi login Anda telah berakhir. Silakan muat ulang halaman dan coba lagi.",
    429: "Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sejenak sebelum mencoba kembali."
  };
  const displayTitle = title[status] || "Terjadi Kesalahan";
  const displayDescription = description[status] || "Terjadi kesalahan yang tidak terduga pada sistem.";
  return <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-6 py-12 lg:px-8 font-sans antialiased text-gray-900"><Head title={displayTitle} /><div className="text-center w-full max-w-2xl bg-white p-10 md:p-16 rounded-3xl shadow-sm border border-gray-100"><p className="text-5xl font-extrabold text-teal-600 mb-4">{status}</p><h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-6">{displayTitle}</h1><p className="text-lg leading-7 text-gray-500 mb-10 max-w-lg mx-auto">{displayDescription}</p><div className="flex flex-col sm:flex-row items-center justify-center gap-4"><button
    onClick={() => window.history.back()}
    className="w-full sm:w-auto px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-full font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
  >
                        Kembali
                    </button><Link
    href="/"
    className="w-full sm:w-auto px-6 py-3 bg-blue-700 text-white rounded-full font-bold shadow-md transition-all duration-200"
  >
                        Kembali ke Beranda
                    </Link></div></div></div>;
}
