// backend/src/routes/tasks.js
import { Router } from 'express';
import Task from '../models/Task.js';
import { randomUUID } from 'crypto';

const router = Router();

/** GET /api/tasks/analytics — task performance analytics */
router.get('/analytics', async (req, res, next) => {
  try {
    const { companyId, range, employeeId, department } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    const filter = { companyId };
    if (employeeId) filter.assigneeId = employeeId;

    const now = new Date();
    let startDate;
    if (range === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // default: month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    filter.created_at = { $gte: startDate };

    const allTasks = await Task.find(filter);
    const completed = allTasks.filter(t => t.status === 'Completed' || t.status === 'Approved');
    const completionRate = allTasks.length > 0
      ? Math.round((completed.length / allTasks.length) * 100)
      : 0;

    // Build per-day chart data
    const days = range === 'year' ? 12 : range === 'week' ? 7 : 30;
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      if (range === 'year') {
        d.setMonth(now.getMonth() - i);
        const label = d.toLocaleString('default', { month: 'short' });
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const dayCompleted = completed.filter(t => {
          const td = new Date(t.updated_at || t.created_at);
          return td >= monthStart && td <= monthEnd;
        }).length;
        const dayTotal = allTasks.filter(t => {
          const td = new Date(t.created_at);
          return td >= monthStart && td <= monthEnd;
        }).length;
        chartData.push({ label, completed: dayCompleted, assigned: dayTotal });
      } else {
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayStr = d.toISOString().split('T')[0];
        const dayCompleted = completed.filter(t => {
          const td = new Date(t.updated_at || t.created_at).toISOString().split('T')[0];
          return td === dayStr;
        }).length;
        const dayTotal = allTasks.filter(t => {
          const td = new Date(t.created_at).toISOString().split('T')[0];
          return td === dayStr;
        }).length;
        chartData.push({ label, completed: dayCompleted, assigned: dayTotal });
      }
    }

    // Leaderboard
    const byEmployee = {};
    allTasks.forEach(t => {
      if (!byEmployee[t.assigneeId]) {
        byEmployee[t.assigneeId] = { name: t.assigneeName || 'Unknown', total: 0, completed: 0 };
      }
      byEmployee[t.assigneeId].total++;
      if (t.status === 'Completed' || t.status === 'Approved') {
        byEmployee[t.assigneeId].completed++;
      }
    });

    const leaderboard = Object.entries(byEmployee)
      .map(([id, d]) => ({
        id,
        name: d.name,
        total: d.total,
        completed: d.completed,
        kpiScore: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.kpiScore - a.kpiScore);

    res.json({
      total: allTasks.length,
      completed: completed.length,
      completionRate,
      chartData,
      leaderboard,
    });
  } catch (err) { next(err); }
});

/** GET /api/tasks — list all tasks (requires companyId) */
router.get('/', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    const tasks = await Task.find({ companyId }).sort({ created_at: -1 });
    res.json({ tasks });
  } catch (err) { next(err); }
});

/** GET /api/tasks/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const task = await Task.findOne({ _id: req.params.id, companyId });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) { next(err); }
});

/** POST /api/tasks — create task */
router.post('/', async (req, res, next) => {
  try {
    const { companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    const task = await Task.create({ ...req.body, messages: [] });
    res.status(201).json({ task });
  } catch (err) { next(err); }
});

/** PATCH /api/tasks/:id/status — update status */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const task = await Task.findOneAndUpdate({ _id: req.params.id, companyId }, { status }, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) { next(err); }
});

/** PATCH /api/tasks/:id/submission — submit proof */
router.patch('/:id/submission', async (req, res, next) => {
  try {
    const { companyId, ...rest } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const submission = { ...rest, submittedAt: new Date().toISOString() };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { submission, status: 'Completed' },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) { next(err); }
});

/** POST /api/tasks/:id/messages — add chat message */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { senderId, senderName, text, fileUrl, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const msg = { id: randomUUID(), senderId, senderName, text, fileUrl, timestamp: new Date().toISOString() };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $push: { messages: msg } },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) { next(err); }
});

const TASK_PATCH_KEYS = [
  'title', 'category', 'assigneeId', 'assigneeName', 'assigneeIds', 'assignedById', 'assignedByName',
  'kpiRelationId', 'kpiRelationName', 'type', 'taskKind', 'deadlineAt', 'status', 'deadline', 'timeSpent', 'notes',
  'priority', 'tags', 'dependsOnTaskId', 'recurring',
];

/** PATCH /api/tasks/:id — partial update (priority, tags, dependency, etc.) */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, ...body } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const updates = {};
    for (const k of TASK_PATCH_KEYS) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: updates },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ task });
  } catch (err) { next(err); }
});

/** DELETE /api/tasks/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const task = await Task.findOneAndDelete({ _id: req.params.id, companyId });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

export default router;
