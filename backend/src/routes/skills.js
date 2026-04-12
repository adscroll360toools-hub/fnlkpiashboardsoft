import { Router } from 'express';
import SkillGrowth from '../models/SkillGrowth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const skills = await SkillGrowth.find({ companyId }).sort({ created_at: -1 });
    res.json({ skills });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { companyId, userId, userName, role, skill, progress, target } = req.body;
    if (!companyId || !userId || !skill?.trim()) {
      return res.status(400).json({ error: 'companyId, userId and skill are required' });
    }
    const row = await SkillGrowth.create({
      companyId,
      userId,
      userName: userName || '',
      role: role || '',
      skill: skill.trim(),
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      target: Math.min(100, Math.max(1, Number(target) || 100)),
    });
    res.status(201).json({ skill: row });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, progress, target, skill } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const updates = {};
    if (progress !== undefined) updates.progress = Math.min(100, Math.max(0, Number(progress)));
    if (target !== undefined) updates.target = Math.min(100, Math.max(1, Number(target)));
    if (skill !== undefined) updates.skill = String(skill).trim();
    const row = await SkillGrowth.findOneAndUpdate({ _id: req.params.id, companyId }, updates, { new: true });
    if (!row) return res.status(404).json({ error: 'Skill entry not found' });
    res.json({ skill: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const removed = await SkillGrowth.findOneAndDelete({ _id: req.params.id, companyId });
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
