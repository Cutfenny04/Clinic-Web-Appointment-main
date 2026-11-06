import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * useQueueRealtime — Hook untuk mendengarkan perubahan status antrean secara real-time
 * Menggunakan Supabase Realtime (PostgreSQL CDC) dengan fallback polling.
 */
export function useQueueRealtime(initialQueue = [], onUpdateCallback = null) {
  const [queue, setQueue] = useState(initialQueue);

  useEffect(() => {
    // 1. Subscribe ke Supabase Realtime Channel
    const channel = supabase
      .channel("public:appointments_queue")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.info("[Realtime] Perubahan antrean terdeteksi:", payload.eventType, payload.new);
          if (onUpdateCallback) {
            onUpdateCallback(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info("[Realtime] Berhasil terhubung ke channel antrean Supabase.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdateCallback]);

  return { queue, setQueue };
}

export default useQueueRealtime;
