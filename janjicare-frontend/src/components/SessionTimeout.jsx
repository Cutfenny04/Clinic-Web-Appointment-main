import { useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
export default function SessionTimeout() {
  const { auth } = usePage().props;
  useEffect(() => {
    if (!auth.user) return;
    let timeoutId;
    const TIMEOUT_DURATION = 15 * 60 * 1e3;
    const handleIdle = () => {
      router.post(route("logout"), {}, {
        onSuccess: () => {
          window.location.href = route("login") + "?inactivity=1";
        }
      });
    };
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdle, TIMEOUT_DURATION);
    };
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    resetTimer();
    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [auth.user]);
  return null;
}
