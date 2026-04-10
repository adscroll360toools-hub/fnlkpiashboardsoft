// backend/src/routes/users.js
import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

/** GET /api/users — list all users (requires companyId) */
router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    const users = await User.find({ companyId }).sort({ created_at: -1 });
    res.json({ users });
  } catch (err) { next(err); }
});

/** GET /api/users/:id — get single user */
router.get('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const user = await User.findOne({ _id: req.params.id, companyId });
    if (!user) return res.status(404).json({ error: 'User not found or unauthorized' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** POST /api/users — create user */
router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role, department, position, companyId, companyRoleId } = req.body;
    if (!name || !email || !password || !companyId) {
      return res.status(400).json({ error: 'name, email, password and companyId are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const user = await User.create({
      name, email, password, role, department, position, companyId,
      companyRoleId: companyRoleId || null,
    });
    res.status(201).json({ user });
  } catch (err) { next(err); }
});

/** POST /api/users/login — authenticate user */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    res.json({ user });
  } catch (err) { next(err); }
});

/** PATCH /api/users/:id — update user */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const allowed = ['name', 'email', 'password', 'role', 'department', 'position', 'score', 'companyRoleId'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findOneAndUpdate({ _id: req.params.id, companyId }, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found or unauthorized' });
    res.json({ user });
  } catch (err) { next(err); }
});

/** DELETE /api/users/:id — remove user */
router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const user = await User.findOneAndDelete({ _id: req.params.id, companyId });
    if (!user) return res.status(404).json({ error: 'User not found or unauthorized' });
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
});

export default router;
