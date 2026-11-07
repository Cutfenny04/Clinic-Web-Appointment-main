import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Memuat data dari API dengan state loading / error / data, plus reload & polling opsional.
 *   const { data, loading, error, reload } = useApi(() => apiService.doctors.list(), [], { interval: 10000 });
 * Fungsi harus mengembalikan respons backend ({ success, data }) — yang diambil adalah .data.
 */
export function useApi(fetcher, deps = [], { interval = 0, enabled = true, initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const alive = useRef(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetcherRef.current();
      if (alive.current) {
        setData(res && Object.prototype.hasOwnProperty.call(res, "data") ? res.data : res);
        setError(null);
      }
    } catch (e) {
      if (alive.current && !silent) setError(e);
    } finally {
      if (alive.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    if (enabled) load();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!interval || !enabled) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, interval);
    return () => clearInterval(id);
  }, [interval, enabled, load]);

  return { data, setData, loading, error, reload: load };
}

/** Menjalankan aksi (POST/PATCH/DELETE) dengan state "processing". */
export function useAction() {
  const [processing, setProcessing] = useState(false);
  const run = useCallback(async (fn) => {
    setProcessing(true);
    try {
      return await fn();
    } finally {
      setProcessing(false);
    }
  }, []);
  return { processing, run };
}
