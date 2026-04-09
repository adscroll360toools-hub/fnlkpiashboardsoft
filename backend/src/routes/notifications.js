import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// Get notifications for a company
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const notifications = await Notification.find({ companyId }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
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

export default router;
