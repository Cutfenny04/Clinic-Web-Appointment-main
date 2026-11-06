import { useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
export function useAutoRefresh(dataKeys, options = {}) {
  const {
    channel = "queue",
    pollingInterval = 3e4,
    pollingOnly = false
  } = options;
  const dataKeysRef = useRef(dataKeys);
  dataKeysRef.current = dataKeys;
  const reloadingRef = useRef(false);
  const doReload = () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    router.reload({
      only: dataKeysRef.current,
      onFinish: () => {
        reloadingRef.current = false;
      }
    });
  };
  useEffect(() => {
    if (pollingOnly || !window.Echo) return;
    const echoChannel = window.Echo.channel(channel);
    echoChannel.listen(".App\\Events\\AppointmentUpdated", doReload);
    echoChannel.listen("AppointmentUpdated", doReload);
    return () => {
      try {
        echoChannel.stopListening(".App\\Events\\AppointmentUpdated");
        echoChannel.stopListening("AppointmentUpdated");
      } catch {
      }
    };
  }, [channel, pollingOnly]);
  useEffect(() => {
    if (!pollingInterval || pollingInterval <= 0) return;
    const timer = setInterval(doReload, pollingInterval);
    return () => clearInterval(timer);
  }, [pollingInterval]);
}
