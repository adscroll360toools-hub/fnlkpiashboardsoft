import type { AppUser } from "@/context/AuthContext";

/** People who check in and appear on team attendance / leaderboard (not admins). */
export function companyOperationalTeam(users: AppUser[]): AppUser[] {
  return users.filter((u) => u.role === "employee" || u.role === "controller");
}
