/** Legacy companies without `hoursPerDay` historically behaved like an 8h day baseline. */
const LEGACY_DEFAULT_HOURS_PER_DAY = 8;

export type WorkingHoursShape = {
  start?: string;
  end?: string;
  workingDaysPerMonth?: number;
  hoursPerDay?: number;
  standupTime?: string;
};

/** Resolved hours per working day (1–24) for capacity / workload displays. */
export function getHoursPerDay(workingHours: WorkingHoursShape | null | undefined): number {
  const n = Number(workingHours?.hoursPerDay);
  if (Number.isFinite(n)) {
    const rounded = Math.round(n);
    if (rounded >= 1 && rounded <= 24) return rounded;
  }
  return LEGACY_DEFAULT_HOURS_PER_DAY;
}
