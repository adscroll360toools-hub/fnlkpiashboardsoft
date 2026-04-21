// backend/src/routes/kpis.js
import { Router } from 'express';
import KPI from '../models/KPI.js';
import { canManageKpi, resolveActor } from '../utils/companyPermissions.js';

const router = Router();

/** Controllers only see KPI rows scoped to them (and optional employee subset). */
function kpiVisibleToController(k, controllerId) {
  const cid = String(controllerId);
  if (!k.managedByControllerId || String(k.managedByControllerId) !== cid) return false;
  if (k.type !== 'Individual') return true;
  const ids = Array.isArray(k.managedEmployeeIds) ? k.managedEmployeeIds.map(String) : [];
  if (ids.length === 0) return true;
  return !!k.assignedToId && ids.includes(String(k.assignedToId));
}

/** GET /api/kpis (requires companyId) */
router.get('/', async (req, res, next) => {
  try {
    const { companyId, actorUserId } = req.query;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canManageKpi(actor)) return res.status(403).json({ error: 'KPI access denied' });

    let kpis = await KPI.find({ companyId }).sort({ created_at: -1 });
    if (actor?.user?.role === 'controller') {
      const controllerId = String(actor.user._id);
      kpis = kpis.filter((k) => kpiVisibleToController(k, controllerId));
    }
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
