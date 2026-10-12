const pad2 = (value: number) => String(value).padStart(2, "0");

const formatIsoDate = (year: number, month: number, day: number) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

// Не через `new Date().toISOString()`: setHours(0,0,0,0) — локальная полночь,
// toISOString() конвертирует её в UTC — для UTC+6 (Бишкек) это 18:00
// предыдущего дня, дата всегда съезжала на день назад. Считаем через
// getFullYear/getMonth/getDate без конвертации в UTC.
// См. docs/sale-flow-bugs.md, пункт 4.
export const getTodayIsoDate = () => {
  const now = new Date();
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

export const addCalendarDaysToIso = (days: any) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) || 0));
  return formatIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

export const calcDaysUntilIsoDate = (isoDate: any) => {
  if (!isoDate) return 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 30;
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
};

export const formatDaysLabel = (days: any) => {
  const n = Number(days);
  if (!Number.isFinite(n)) return "дней";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
};
