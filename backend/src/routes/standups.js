import { Router } from 'express';
import Standup from '../models/Standup.js';

const router = Router();

/** GET /api/standups?companyId=&from=YYYY-MM-DD&to=YYYY-MM-DD&standupDate= */
router.get('/', async (req, res, next) => {
  try {
    const { companyId, from, to, standupDate } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const filter = { companyId };
    if (req.query.userId) filter.userId = req.query.userId;
    if (standupDate) {
      filter.standupDate = standupDate;
    } else if (from || to) {
      filter.standupDate = {};
      if (from) filter.standupDate.$gte = from;
      if (to) filter.standupDate.$lte = to;
    }

    const standups = await Standup.find(filter).sort({ standupDate: -1, submittedAt: -1 });
    res.json({ standups });
  } catch (err) {
    next(err);
  }
});

/** POST /api/standups — create or replace standup for user+date (upsert) */
router.post('/', async (req, res, next) => {
  try {
    const {
      companyId,
      userId,
      userName,
      standupDate,
      yesterdayWork,
      todayPlan,
      blockers,
    } = req.body;

    if (!companyId || !userId || !standupDate) {
      return res.status(400).json({ error: 'companyId, userId and standupDate are required' });
    }
    if (!yesterdayWork?.trim() || !todayPlan?.trim()) {
      return res.status(400).json({ error: 'yesterdayWork and todayPlan are required' });
    }

    const standup = await Standup.findOneAndUpdate(
      { companyId, userId, standupDate },
      {
        $set: {
          userName: (userName || '').trim(),
          yesterdayWork: yesterdayWork.trim(),
          todayPlan: todayPlan.trim(),
          blockers: (blockers && String(blockers).trim()) || 'None',
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ standup });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/standups/:id */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, yesterdayWork, todayPlan, blockers, userName } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const updates = {};
    if (userName !== undefined) updates.userName = String(userName).trim();
    if (yesterdayWork !== undefined) updates.yesterdayWork = String(yesterdayWork).trim();
    if (todayPlan !== undefined) updates.todayPlan = String(todayPlan).trim();
    if (blockers !== undefined) updates.blockers = String(blockers).trim() || 'None';
    updates.submittedAt = new Date();

    const standup = await Standup.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: updates },
      { new: true }
    );
    if (!standup) return res.status(404).json({ error: 'Standup not found' });
    res.json({ standup });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/standups/:id?companyId= */
router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const removed = await Standup.findOneAndDelete({ _id: req.params.id, companyId });
    if (!removed) return res.status(404).json({ error: 'Standup not found' });
    res.json({ message: 'Standup deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
