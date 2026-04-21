// backend/src/routes/kpis.js
import { Router } from 'express';
import KPI from '../models/KPI.js';
import { canManageKpi, resolveActor } from '../utils/companyPermissions.js';

const router = Router();

/** GET /api/kpis (requires companyId) */
router.get('/', async (req, res, next) => {
  try {
    const { companyId, actorUserId } = req.query;
    if (!companyId || !actorUserId) return res.status(400).json({ error: 'companyId and actorUserId are required' });
    const actor = await resolveActor(companyId, actorUserId);
    if (!canManageKpi(actor)) return res.status(403).json({ error: 'KPI access denied' });

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

    const kpi = await KPI.create({ ...req.body, current: 0 });
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
    const kpi = await KPI.findOneAndUpdate({ _id: req.params.id, companyId }, { current }, { new: true });
    if (!kpi) return res.status(404).json({ error: 'KPI not found or unauthorized' });
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
    const kpi = await KPI.findOneAndDelete({ _id: req.params.id, companyId });
    if (!kpi) return res.status(404).json({ error: 'KPI not found or unauthorized' });
    res.json({ message: 'KPI deleted' });
  } catch (err) { next(err); }
});

export default router;
