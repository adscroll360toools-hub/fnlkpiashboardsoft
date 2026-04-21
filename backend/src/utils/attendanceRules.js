export const DEFAULT_ATTENDANCE_SETTINGS = {
  workStart: '09:00',
  workEnd: '18:00',
  lateAfterMinutes: 15,
  absentIfNoCheckInBy: '10:30',
  resetDay: 'Sunday',
  statusWindows: {
    present: { start: '00:00', end: '09:15' },
    late: { start: '09:16', end: '10:29' },
    absent: { start: '10:30', end: '23:59' },
    leave: { start: '00:00', end: '23:59' },
    break: { start: '00:00', end: '23:59' },
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
  const absentBy = parseHHMM(cfg.absentIfNoCheckInBy) ?? workStart + lateAfter + 60;
  if (checkInMins <= workStart + lateAfter) return 'Present';
  if (checkInMins < absentBy) return 'Late';
  return 'Absent';
}
