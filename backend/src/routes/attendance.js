// backend/src/routes/attendance.js
import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import BreakRequest from '../models/BreakRequest.js';

const router = Router();

/** GET /api/attendance — list all records (requires companyId) */
router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    const records = await Attendance.find({ companyId }).sort({ date: -1 });
    res.json({ records });
  } catch (err) { next(err); }
});

/** POST /api/attendance/checkin — check in */
router.post('/checkin', async (req, res, next) => {
  try {
    const { userId, date, checkInTime, status, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const record = await Attendance.findOneAndUpdate(
      { userId, date },
      { $set: { checkInTime, status, companyId } },
      { upsert: true, new: true }
    );
    res.json({ record });
  } catch (err) { next(err); }
});

/** PATCH /api/attendance/:id/checkout — check out */
router.patch('/:id/checkout', async (req, res, next) => {
  try {
    const { checkOutTime, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { checkOutTime },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Attendance record not found or unauthorized' });
    res.json({ record });
  } catch (err) { next(err); }
});

/** PATCH /api/attendance/:id — generic update (status, break times, etc.) */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const allowed = ['status', 'checkInTime', 'checkOutTime', 'breakStartTime', 'breakEndTime'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const record = await Attendance.findOneAndUpdate({ _id: req.params.id, companyId }, updates, { new: true });
    if (!record) return res.status(404).json({ error: 'Record not found or unauthorized' });
    res.json({ record });
  } catch (err) { next(err); }
});

/** POST /api/attendance/upsert — upsert by userId+date (updateMemberAttendance) */
router.post('/upsert', async (req, res, next) => {
  try {
    const { userId, date, status, checkInTime, checkOutTime, breakStartTime, breakEndTime, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const record = await Attendance.findOneAndUpdate(
      { userId, date },
      { $set: { status, checkInTime, checkOutTime, breakStartTime, breakEndTime, companyId } },
      { upsert: true, new: true }
    );
    res.json({ record });
  } catch (err) { next(err); }
});

// ── Break Requests ────────────────────────────────────────

/** GET /api/attendance/breaks — list all break requests (requires companyId) */
router.get('/breaks', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const breakRequests = await BreakRequest.find({ companyId }).sort({ requestedAt: -1 });
    res.json({ breakRequests });
  } catch (err) { next(err); }
});

/** POST /api/attendance/breaks — create break request */
router.post('/breaks', async (req, res, next) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    const br = await BreakRequest.create({ ...req.body, requestedAt: new Date().toISOString() });
    res.status(201).json({ breakRequest: br });
  } catch (err) { next(err); }
});

/** PATCH /api/attendance/breaks/:id — update break request status */
router.patch('/breaks/:id', async (req, res, next) => {
  try {
    const { companyId, status } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const br = await BreakRequest.findOneAndUpdate({ _id: req.params.id, companyId }, { status }, { new: true });
    if (!br) return res.status(404).json({ error: 'Break request not found or unauthorized' });
    res.json({ breakRequest: br });
  } catch (err) { next(err); }
});

export default router;
