// backend/src/routes/roles.js
import { Router } from 'express';
import CompanyRole from '../models/CompanyRole.js';

const router = Router();

const mergePermissions = (incoming, portalBase) => {
  const base = {
    tasks_create: portalBase === 'controller',
    tasks_assign: portalBase === 'controller',
    tasks_delete: portalBase === 'controller',
    users_manage: false,
    roles_manage: false,
    reports_view: true,
    kpi_manage: portalBase === 'controller',
    attendance_view: true,
  };
  if (!incoming || typeof incoming !== 'object') return base;
  return { ...base, ...incoming };
};

router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const roles = await CompanyRole.find({ companyId }).sort({ created_at: -1 });
    res.json({ roles });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { companyId, name, portalBase, description, permissions } = req.body;
    if (!companyId || !name || !portalBase) {
      return res.status(400).json({ error: 'companyId, name and portalBase are required' });
    }
    const role = await CompanyRole.create({
      companyId,
      name: name.trim(),
      portalBase,
      description: description || '',
      permissions: mergePermissions(permissions, portalBase),
    });
    res.status(201).json({ role });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, name, description, permissions } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (permissions !== undefined) {
      const existing = await CompanyRole.findOne({ _id: req.params.id, companyId });
      if (!existing) return res.status(404).json({ error: 'Role not found' });
      updates.permissions = mergePermissions(permissions, existing.portalBase);
    }
    const role = await CompanyRole.findOneAndUpdate({ _id: req.params.id, companyId }, updates, { new: true });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ role });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const role = await CompanyRole.findOneAndDelete({ _id: req.params.id, companyId });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
