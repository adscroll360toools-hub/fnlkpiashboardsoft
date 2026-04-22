// backend/src/routes/kpis.js
import { Router } from 'express';
import KPI from '../models/KPI.js';
import Notification from '../models/Notification.js';
import { canManageKpi, canViewCompanyKpis, resolveActor } from '../utils/companyPermissions.js';

const router = Router();

async function createNotification({
  companyId,
  title,
  message,
  senderId = 'system',
  senderName = 'System',
  type = 'KPI',
}) {
  if (!companyId || !title || !message) return;
  try {
    await Notification.create({ companyId, title, message, senderId, senderName, type });
  } catch (err) {
    console.error('KPI notification error:', err);
  }
}

/** Controllers only manage KPI rows scoped to them (PATCH/DELETE); list GET is company-wide for leaderboards. */
function kpiVisibleToController(k, controllerId) {
  const cid = String(controllerId);
  if (!k.managedByControllerId || String(k.managedByControllerId) !== cid) return false;
  if (k.type !== 'Individual') return true;
  const ids = Array.isArray(k.managedEmployeeIds) ? k.managedEmployeeIds.map(String) : [];
  if (ids.length === 0) return true;
  return !!k.assignedToId && ids.includes(String(k.assignedToId));
}

/** GET /api/kpis (requires companyId) — full company list for all roles (leaderboard parity). */
router.get('/', async (req, res, next) => {
  try {
    const { companyId, actorUserId } = req.query;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canViewCompanyKpis(actor)) return res.status(403).json({ error: 'KPI access denied' });

    const kpis = await KPI.find({ companyId }).sort({ created_at: -1 });
    res.json({ kpis });
  } catch (err) { next(err); }
});

/** POST /api/kpis */
router.post('/', async (req, res, next) => {
  try {
    const { companyId, actorUserId } = req.body;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canManageKpi(actor)) return res.status(403).json({ error: 'KPI access denied' });

    const body = { ...req.body };
    if (actor?.user?.role === 'controller') {
      body.managedByControllerId = String(actor.user._id);
    }

    const kpi = await KPI.create({ ...body, current: 0 });

    await createNotification({
      companyId,
      type: 'KPI',
      title: 'KPI Created',
      message: `${actor.user?.name || 'Manager'} created KPI "${kpi.name}"${kpi.assignedToName ? ` for ${kpi.assignedToName}` : ''}.`,
      senderId: String(actor.user?._id || 'system'),
      senderName: actor.user?.name || 'System',
    });

    res.status(201).json({ kpi });
  } catch (err) { next(err); }
});

/** PATCH /api/kpis/:id/progress */
router.patch('/:id/progress', async (req, res, next) => {
  try {
    const { current, companyId, actorUserId } = req.body;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canManageKpi(actor)) return res.status(403).json({ error: 'KPI access denied' });
    const existing = await KPI.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'KPI not found or unauthorized' });
    if (actor?.user?.role === 'controller' && !kpiVisibleToController(existing, actor.user._id)) {
      return res.status(403).json({ error: 'KPI access denied' });
    }
    const kpi = await KPI.findOneAndUpdate({ _id: req.params.id, companyId }, { current }, { new: true });

    await createNotification({
      companyId,
      type: 'KPI',
      title: 'KPI Progress Updated',
      message: `${kpi.name}: progress is now ${kpi.current}/${kpi.target}.`,
      senderId: String(actor.user?._id || 'system'),
      senderName: actor.user?.name || 'System',
    });

    res.json({ kpi });
  } catch (err) { next(err); }
});

/** DELETE /api/kpis/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId, actorUserId } = req.query;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canManageKpi(actor)) return res.status(403).json({ error: 'KPI access denied' });
    const existing = await KPI.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'KPI not found or unauthorized' });
    if (actor?.user?.role === 'controller' && !kpiVisibleToController(existing, actor.user._id)) {
      return res.status(403).json({ error: 'KPI access denied' });
    }
    await KPI.findOneAndDelete({ _id: req.params.id, companyId });
    res.json({ message: 'KPI deleted' });
  } catch (err) { next(err); }
});

export default router;
