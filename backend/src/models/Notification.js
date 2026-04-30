import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Meeting', 'Extra Addition', 'System', 'Other', 'Task', 'Message', 'Update', 'KPI', 'Standup'],
    default: 'System',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  senderId: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  audienceType: {
    type: String,
    enum: ['public', 'role', 'user'],
    default: 'public',
  },
  targetRole: {
    type: String,
    default: null,
  },
  targetUserId: {
    type: String,
    default: null,
  },
  readByUserIds: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
