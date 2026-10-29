export function formatTime12Hour(timeString) {
  if (!timeString) return "";
  try {
    const parts = timeString.split(":");
    if (parts.length < 2) return timeString;
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return timeString;
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  } catch (_e) {
    return timeString;
  }
}
