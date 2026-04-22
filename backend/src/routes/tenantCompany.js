import { Router } from 'express';
import Company from '../models/Company.js';
import { canEditCompanySettings, resolveActor } from '../utils/companyPermissions.js';

const router = Router();

/** GET /api/tenant-company?companyId= — no password */
router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const company = await Company.findById(companyId).select('-adminPassword');
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tenant-company/:companyId — attendanceSettings etc. */
router.patch('/:companyId', async (req, res, next) => {
  try {
    const { actorUserId } = req.body;
    if (!actorUserId) return res.status(400).json({ error: 'actorUserId is required' });
    const actor = await resolveActor(req.params.companyId, actorUserId);
    if (!canEditCompanySettings(actor)) {
      return res.status(403).json({ error: 'Only company admin can edit company settings' });
    }
    const allowed = ['attendanceSettings', 'workingHours', 'name', 'industry', 'website'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields' });
    }
    const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: updates }, { new: true, runValidators: true }).select('-adminPassword');
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (err) {
    next(err);
  }
});

export default router;
