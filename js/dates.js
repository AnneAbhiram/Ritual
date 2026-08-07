export function todayStr() {
  return toDateStr(new Date());
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toDateStr(d);
}

export function weekStartFor(dateStr, weekStartDay) {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay();
  const startDow = weekStartDay === "monday" ? 1 : 0;
  const diff = (dow - startDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toDateStr(d);
}

export function monthStartFor(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function periodRange(habit, refDate, weekStartDay) {
  if (habit.period === "weekly") {
    const start = weekStartFor(refDate, weekStartDay);
    const end = addDays(start, 6);
    return { start, end, key: `w:${start}` };
  }
  const d = new Date(refDate + "T00:00:00");
  const start = monthStartFor(refDate);
  const end = toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const key = `m:${start.slice(0, 7)}`;
  return { start, end, key };
}

export function formatHeaderDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}
