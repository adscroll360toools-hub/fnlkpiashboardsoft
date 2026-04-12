/** Company admin attendance rules (aligned with backend Company.attendanceSettings). */
export type AttendanceRules = {
  workStart: string;
  workEnd: string;
  lateAfterMinutes: number;
  absentIfNoCheckInBy: string;
};

export const DEFAULT_ATTENDANCE_RULES: AttendanceRules = {
  workStart: "09:00",
  workEnd: "18:00",
  lateAfterMinutes: 15,
  absentIfNoCheckInBy: "10:30",
};

/** Parse "HH:mm" 24h */
export function parseHHMMToMinutes(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59 || Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/** Parse times like "9:30 AM" / "09:35 AM" from check-in strings. */
export function parseEnTimeToMinutes(s: string): number | null {
  const t = String(s).trim().toUpperCase();
  const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const ap = match[3];
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Present if check-in by workStart + lateAfterMinutes; Late until absentIfNoCheckInBy; else Absent. */
export function statusFromCheckInTime(checkInTime: string, rules: AttendanceRules): "Present" | "Late" | "Absent" {
  const cin = parseEnTimeToMinutes(checkInTime);
  if (cin == null) return "Present";
  const ws = parseHHMMToMinutes(rules.workStart) ?? 9 * 60;
  const lateCutoff = ws + Math.max(0, Number(rules.lateAfterMinutes) || 0);
  const absentCut = parseHHMMToMinutes(rules.absentIfNoCheckInBy) ?? lateCutoff + 60;
  if (cin <= lateCutoff) return "Present";
  if (cin < absentCut) return "Late";
  return "Absent";
}
