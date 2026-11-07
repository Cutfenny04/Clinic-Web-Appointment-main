/** Notifikasi singkat lewat komponen <Toast /> yang sudah ada di SidebarLayout. */
export function toast(message, type = "success") {
  window.dispatchEvent(new CustomEvent("show-toast", { detail: { message, type } }));
}
toast.error = (m) => toast(m, "error");
toast.success = (m) => toast(m, "success");
export default toast;
