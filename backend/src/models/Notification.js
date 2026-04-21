import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Meeting', 'Extra Addition', 'System', 'Other'],
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
  readByUserIds: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
