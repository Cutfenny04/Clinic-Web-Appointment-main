/** Logo JanjiCare klasik: monogram serif dalam bingkai + wordmark Playfair. */
export function BrandMark({ size = 36, className = "" }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-md bg-plum text-heather font-serif font-semibold leading-none dark:bg-heather dark:text-ink ${className}`}
    >
      J
    </span>
  );
}

export default function Brand({ size = 36, textClass = "text-2xl", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span className={`font-serif font-semibold tracking-tight text-ink dark:text-white ${textClass}`}>JanjiCare</span>
    </span>
  );
}
