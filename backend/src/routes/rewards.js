import { Router } from 'express';
import Reward from '../models/Reward.js';
import RewardAck from '../models/RewardAck.js';

const router = Router();

function isEligible(reward, user) {
  if (user.role === 'admin' || user.role === 'super_admin') return false;
  if (reward.eligibleEmployeeId) return reward.eligibleEmployeeId === user.id;
  const role = reward.eligibleRole;
  if (role == null || role === '' || role === 'All') {
    return user.role === 'employee' || user.role === 'controller';
  }
  return role === user.role;
}

/** GET /api/rewards/pending?companyId=&userId=&userRole= — register before `/` */
router.get('/pending', async (req, res, next) => {
  try {
    const { companyId, userId, userRole } = req.query;
    if (!companyId || !userId || !userRole) {
      return res.status(400).json({ error: 'companyId, userId and userRole are required' });
    }
    const user = { id: userId, role: userRole };
    const rewards = await Reward.find({ companyId });
    const acked = await RewardAck.find({ companyId, userId }).distinct('rewardId');
    const pending = rewards.filter((r) => isEligible(r, user) && !acked.includes(r._id.toString()));
    res.json({ rewards: pending });
  } catch (err) {
    next(err);
  }
});

/** GET /api/rewards?companyId= */
router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const rewards = await Reward.find({ companyId }).sort({ created_at: -1 });
    res.json({ rewards });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { companyId, title } = req.body;
    if (!companyId || !title?.trim()) {
      return res.status(400).json({ error: 'companyId and title are required' });
    }
    const allowedTypes = ['bonus', 'certificate', 'recognition', 'gift'];
    const rewardType = allowedTypes.includes(req.body.rewardType) ? req.body.rewardType : 'recognition';
    const reward = await Reward.create({
      companyId,
      title: String(title).trim(),
      description: String(req.body.description || ''),
      imageUrl: String(req.body.imageUrl || ''),
      eligibleRole: req.body.eligibleRole ?? null,
      eligibleEmployeeId: req.body.eligibleEmployeeId ?? null,
      createdById: String(req.body.createdById || ''),
      createdByName: String(req.body.createdByName || ''),
      rewardType,
    });
    res.status(201).json({ reward });
  } catch (err) {
    next(err);
  }
});

/** POST /api/rewards/:rewardId/ack — mark seen for user */
router.post('/:rewardId/ack', async (req, res, next) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }
    await RewardAck.findOneAndUpdate(
      { companyId, userId, rewardId: req.params.rewardId },
      {},
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    await RewardAck.deleteMany({ companyId, rewardId: req.params.id });
    const removed = await Reward.findOneAndDelete({ _id: req.params.id, companyId });
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
