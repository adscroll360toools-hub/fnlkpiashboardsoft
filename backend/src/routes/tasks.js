// backend/src/routes/tasks.js
import { Router } from 'express';
import Task from '../models/Task.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { randomUUID } from 'crypto';

const router = Router();

function assigneeIdSet(task) {
  const ids = new Set();
  if (task.assigneeId) ids.add(String(task.assigneeId));
  for (const id of task.assigneeIds || []) ids.add(String(id));
  return ids;
}

async function assertTaskAccess(task, actorUserId, companyId) {
  if (!actorUserId) return null;
  const actor = await User.findOne({ _id: actorUserId, companyId });
  if (!actor) return null;
  // Chat is intentionally open to any authenticated user in the same company.
  return actor;
}

/** Full task edit (PATCH): task creator (`assignedById`) only — not admin/controller/assignee unless they created it. */
async function assertTaskEditAccess(task, actorUserId, companyId) {
  if (!actorUserId) return null;
  const actor = await User.findOne({ _id: actorUserId, companyId });
  if (!actor) return null;
  if (task.assignedById && String(task.assignedById) === String(actorUserId)) return actor;
  return null;
}

async function createNotification({
  companyId,
  type = 'Task',
  title,
  message,
  senderId = 'system',
  senderName = 'System',
  audienceType = 'public',
  targetRole = null,
  targetUserId = null,
}) {
  if (!companyId || !title || !message) return;
  try {
    await Notification.create({
      companyId,
      type,
      title,
      message,
      senderId,
      senderName,
      audienceType,
      targetRole,
      targetUserId,
    });
  } catch (err) {
    console.error('Task notification error:', err);
  }
}

async function createTaskScopedNotifications({
  companyId,
  type = 'Task',
  title,
  message,
  senderId = 'system',
  senderName = 'System',
  participantIds = [],
}) {
  const uniqueIds = Array.from(new Set((participantIds || []).filter(Boolean).map((id) => String(id))));
  if (!companyId || !title || !message) return;
  if (uniqueIds.length === 0) {
    await createNotification({ companyId, type, title, message, senderId, senderName, audienceType: 'public' });
    return;
  }
  await Promise.all(
    uniqueIds.map((uid) =>
      createNotification({
        companyId,
        type,
        title,
        message,
        senderId,
        senderName,
        audienceType: 'user',
        targetUserId: uid,
      })
    )
  );
}

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

    const participants = new Set([
      ...assigneeIdSet(task),
      String(task.assignedById || ''),
    ]);
    await createTaskScopedNotifications({
      companyId,
      type: 'Task',
      title: 'Task Assigned',
      message: `${task.assignedByName || 'Manager'} assigned "${task.title}" to ${task.assigneeName || 'team member'}.`,
      senderId: task.assignedById || 'system',
      senderName: task.assignedByName || 'System',
      participantIds: Array.from(participants),
    });

    res.status(201).json({ task });
  } catch (err) { next(err); }
});

/** PATCH /api/tasks/:id/status — update status */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, companyId, actorId, actorName } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const task = await Task.findOneAndUpdate({ _id: req.params.id, companyId }, { status }, { new: true });
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });

    const participants = new Set([
      ...assigneeIdSet(task),
      String(task.assignedById || ''),
    ]);
    await createTaskScopedNotifications({
      companyId,
      type: 'Update',
      title: 'Task Status Updated',
      message: `${task.title} is now "${status}" for ${task.assigneeName || 'assignee'}.`,
      senderId: actorId || task.assignedById || 'system',
      senderName: actorName || task.assignedByName || 'System',
      participantIds: Array.from(participants),
    });

    res.json({ task });
  } catch (err) { next(err); }
});

/** PATCH /api/tasks/:id/submission — submit proof */
router.patch('/:id/submission', async (req, res, next) => {
  try {
    const { companyId, actorId, actorName, ...rest } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const submission = { ...rest, submittedAt: new Date().toISOString() };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { submission, status: 'Completed' },
      { new: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found or unauthorized' });

    const participants = new Set([
      ...assigneeIdSet(task),
      String(task.assignedById || ''),
    ]);
    await createTaskScopedNotifications({
      companyId,
      type: 'Task',
      title: 'Task Completed',
      message: `${task.assigneeName || 'Assignee'} submitted "${task.title}" for review.`,
      senderId: actorId || task.assigneeId || 'system',
      senderName: actorName || task.assigneeName || 'System',
      participantIds: Array.from(participants),
    });

    res.json({ task });
  } catch (err) { next(err); }
});

/** POST /api/tasks/:id/messages — add chat message */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { senderId, senderName, text, fileUrl, companyId } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const existing = await Task.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'Task not found or unauthorized' });
    const actor = await assertTaskAccess(existing, senderId, companyId);
    if (!actor) return res.status(403).json({ error: 'Not allowed to post on this task' });

    const msg = {
      id: randomUUID(),
      senderId,
      senderName,
      text,
      fileUrl,
      timestamp: new Date().toISOString(),
      reactions: [],
      readBy: [],
    };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      {
        $push: { messages: msg },
        $set: {
          chatTyping: { userId: null, userName: '', updatedAt: null },
        },
      },
      { new: true }
    );

    const participants = new Set([
      ...assigneeIdSet(task),
      String(task.assignedById || ''),
      String(senderId || ''),
    ]);
    await createTaskScopedNotifications({
      companyId,
      type: 'Message',
      title: `New Task Message: ${task.title}`,
      message: `${senderName}: ${String(text || '').slice(0, 140)}`,
      senderId: senderId || 'system',
      senderName: senderName || 'System',
      participantIds: Array.from(participants),
    });

    res.json({ task });
  } catch (err) { next(err); }
});

const TASK_PATCH_KEYS = [
  'title', 'category', 'assigneeId', 'assigneeName', 'assigneeIds', 'assignedById', 'assignedByName',
  'kpiRelationId', 'kpiRelationName', 'type', 'taskKind', 'deadlineAt', 'status', 'deadline', 'timeSpent', 'notes',
  'priority', 'tags', 'dependsOnTaskId', 'recurring', 'assignedTime', 'accessControl',
];

/** POST /api/tasks/:id/chat-typing — broadcast typing state (clears after timeout on client) */
router.post('/:id/chat-typing', async (req, res, next) => {
  try {
    const { companyId, userId, userName, active } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const existing = await Task.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'Task not found' });
    const actor = await assertTaskAccess(existing, userId, companyId);
    if (!actor) return res.status(403).json({ error: 'Forbidden' });

    const typing =
      active === false || !userId
        ? { userId: null, userName: '', updatedAt: null }
        : { userId, userName: userName || '', updatedAt: new Date() };
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: { chatTyping: typing } },
      { new: true }
    );
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tasks/:id/messages/read — reader acknowledges messages (read receipts) */
router.patch('/:id/messages/read', async (req, res, next) => {
  try {
    const { companyId, readerId } = req.body;
    if (!companyId || !readerId) return res.status(400).json({ error: 'companyId and readerId are required' });
    const task = await Task.findOne({ _id: req.params.id, companyId }).lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const actor = await assertTaskAccess(task, readerId, companyId);
    if (!actor) return res.status(403).json({ error: 'Forbidden' });

    const rid = String(readerId);
    const messages = (task.messages || []).map((m) => {
      const plain = { ...m };
      const sender = String(plain.senderId || '');
      if (sender === rid) return plain;
      const readBy = Array.isArray(plain.readBy) ? [...plain.readBy] : [];
      if (!readBy.includes(rid)) readBy.push(rid);
      return { ...plain, readBy };
    });

    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: { messages } },
      { new: true }
    );
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tasks/:id/messages/:messageId/reaction — toggle emoji reaction */
router.patch('/:id/messages/:messageId/reaction', async (req, res, next) => {
  try {
    const { companyId, userId, emoji } = req.body;
    if (!companyId || !userId || !emoji) {
      return res.status(400).json({ error: 'companyId, userId, and emoji are required' });
    }
    const task = await Task.findOne({ _id: req.params.id, companyId }).lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const actor = await assertTaskAccess(task, userId, companyId);
    if (!actor) return res.status(403).json({ error: 'Forbidden' });

    const messageId = req.params.messageId;
    const uid = String(userId);
    const messages = (task.messages || []).map((m) => {
      const plain = { ...m };
      const mid = plain.id || plain._id;
      if (String(mid) !== String(messageId)) return plain;
      let reactions = Array.isArray(plain.reactions) ? plain.reactions.map((r) => ({ ...r, userIds: [...(r.userIds || [])] })) : [];
      let group = reactions.find((r) => r.emoji === emoji);
      if (!group) {
        group = { emoji, userIds: [] };
        reactions.push(group);
      }
      const set = new Set(group.userIds || []);
      if (set.has(uid)) set.delete(uid);
      else set.add(uid);
      group.userIds = Array.from(set);
      if (group.userIds.length === 0) {
        reactions = reactions.filter((r) => r.emoji !== emoji);
      }
      return { ...plain, reactions };
    });

    const updated = await Task.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: { messages } },
      { new: true }
    );
    res.json({ task: updated });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/tasks/:id — partial update (priority, tags, dependency, etc.) */
router.patch('/:id', async (req, res, next) => {
  try {
    const { companyId, actorId, actorName, ...body } = req.body;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const existing = await Task.findOne({ _id: req.params.id, companyId });
    if (!existing) return res.status(404).json({ error: 'Task not found or unauthorized' });
    const editor = await assertTaskEditAccess(existing, actorId, companyId);
    if (!editor) return res.status(403).json({ error: 'You do not have permission to edit this task' });

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

    const participants = new Set([
      ...assigneeIdSet(task),
      String(task.assignedById || ''),
    ]);
    await createTaskScopedNotifications({
      companyId,
      type: 'Update',
      title: 'Task Updated',
      message: `Task "${task.title}" was updated${task.assigneeName ? ` for ${task.assigneeName}` : ''}.`,
      senderId: actorId || task.assignedById || 'system',
      senderName: actorName || task.assignedByName || 'System',
      participantIds: Array.from(participants),
    });

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
