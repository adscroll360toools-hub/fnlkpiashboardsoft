export const DEFAULT_ATTENDANCE_SETTINGS = {
  workStart: '09:00',
  workEnd: '18:00',
  lateAfterMinutes: 15,
  absentIfNoCheckInBy: '10:30',
  resetDay: 'Sunday',
  statusWindows: {
    present: { start: '09:00', end: '11:30' },
    late: { start: '11:31', end: '13:00' },
    absent: { start: '13:01', end: '14:00' },
    leave: { start: '14:01', end: '08:59' },
    break: { start: '09:00', end: '17:30' },
  },
};

function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function parseMeridiemTime(s) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(s || '').trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function mergeAttendanceSettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ATTENDANCE_SETTINGS };
  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...raw,
    statusWindows: {
      ...DEFAULT_ATTENDANCE_SETTINGS.statusWindows,
      ...(raw.statusWindows || {}),
    },
  };
}

export function statusFromCheckInTime(checkInTime, settings) {
  const cfg = mergeAttendanceSettings(settings);
  const checkInMins = parseMeridiemTime(checkInTime);
  if (checkInMins == null) return 'Present';
  const workStart = parseHHMM(cfg.workStart) ?? 9 * 60;
  const lateAfter = Math.max(0, Number(cfg.lateAfterMinutes) || 0);
  const graceEnd = workStart + lateAfter;
  const absentStart = parseHHMM(cfg.absentIfNoCheckInBy) ?? graceEnd + 60;
  const presentEnd = Math.min(graceEnd, Math.max(0, absentStart - 1));
  if (checkInMins <= presentEnd) return 'Present';
  if (checkInMins < absentStart) return 'Late';
  return 'Absent';
}
