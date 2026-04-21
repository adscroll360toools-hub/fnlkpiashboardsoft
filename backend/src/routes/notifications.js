import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get notifications for a company
router.get('/', async (req, res) => {
  try {
    const { companyId, userId } = req.query;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }

    const notifications = await Notification.find({ companyId }).sort({ createdAt: -1 }).limit(50);
    const withRead = notifications.map((n) => {
      const obj = n.toObject();
      obj.read = Array.isArray(obj.readByUserIds) ? obj.readByUserIds.includes(String(userId)) : false;
      return obj;
    });
    const unreadCount = withRead.filter((n) => !n.read).length;
    res.json({ success: true, notifications: withRead, unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new notification
router.post('/', async (req, res) => {
  try {
    const { companyId, type, title, message, senderId, senderName } = req.body;
    if (!companyId || !title || !message || !senderId || !senderName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notification = await Notification.create({
      companyId,
      type: type || 'Other',
      title,
      message,
      senderId,
      senderName,
    });

    res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a single notification as read for user
router.patch('/:id/read', async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $addToSet: { readByUserIds: String(userId) } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.post('/read-all', async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }
    await Notification.updateMany(
      { companyId },
      { $addToSet: { readByUserIds: String(userId) } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all notifications for company
router.delete('/clear-all', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    await Notification.deleteMany({ companyId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
