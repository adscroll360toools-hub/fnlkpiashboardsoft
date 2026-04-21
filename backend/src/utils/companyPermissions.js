import User from '../models/User.js';
import CompanyRole from '../models/CompanyRole.js';

const ROLE_DEFAULTS = {
  admin: { kpi_manage: true },
  controller: { kpi_manage: true },
  employee: { kpi_manage: false },
  super_admin: { kpi_manage: true },
};

export async function resolveActor(companyId, actorUserId) {
  if (!companyId || !actorUserId) return null;
  const user = await User.findOne({ _id: actorUserId, companyId }).lean();
  if (!user) return null;
  let rolePerms = ROLE_DEFAULTS[user.role] || { kpi_manage: false };
  if (user.companyRoleId) {
    const roleDoc = await CompanyRole.findOne({ _id: user.companyRoleId, companyId }).lean();
    if (roleDoc?.permissions && typeof roleDoc.permissions === 'object') {
      rolePerms = { ...rolePerms, ...roleDoc.permissions };
    }
  }
  return {
    user,
    permissions: rolePerms,
  };
}

export function canManageKpi(actor) {
  if (!actor?.user) return false;
  if (actor.user.role === 'admin' || actor.user.role === 'super_admin') return true;
  if (actor.user.role === 'controller') return true;
  return !!actor.permissions?.kpi_manage;
}

export function canEditCompanySettings(actor) {
  if (!actor?.user) return false;
  return actor.user.role === 'admin' || actor.user.role === 'super_admin';
}
