import { useEffect } from "react";

/** Mengatur judul tab browser: "<judul> - JanjiCare" (pengganti <Head> Inertia). */
export default function Head({ title, children }) {
  useEffect(() => {
    if (title) document.title = `${title} - JanjiCare`;
  }, [title]);
  return children || null;
}
