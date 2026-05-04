// backend/src/models/Task.js
import mongoose from 'mongoose';

const reactionEntrySchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userIds: { type: [String], default: [] },
  },
  { _id: false }
);

const taskMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  senderId: String,
  senderName: String,
  text: String,
  fileUrl: String,
  timestamp: String,
  reactions: { type: [reactionEntrySchema], default: [] },
  readBy: { type: [String], default: [] },
});

const taskSubmissionSchema = new mongoose.Schema({
  textExplanation: String,
  proofImageUrl: String,
  urlLink: String,
  documentUrl: String,
  submittedAt: String,
});

const taskAccessUserGrantSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    access: { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
  },
  { _id: false }
);

const taskAccessControlSchema = new mongoose.Schema(
  {
    roleGrants: { type: [String], default: [] },
    userGrants: { type: [taskAccessUserGrantSchema], default: [] },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    assigneeId: { type: String, required: true },
    assigneeName: { type: String },
    assignedById: { type: String, required: true },
    assignedByName: { type: String },
    kpiRelationId: { type: String },
    kpiRelationName: { type: String },
    type: { type: String, enum: ['Individual', 'Group'], default: 'Individual' },
    taskKind: {
      type: String,
      enum: ['daily', 'one_time', 'deadline_based'],
      default: 'one_time',
    },
    deadlineAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Approved'],
      default: 'Pending',
    },
    deadline: { type: String },
    timeSpent: { type: String },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    tags: { type: [String], default: [] },
    assigneeIds: { type: [String], default: [] },
    dependsOnTaskId: { type: String, default: null },
    recurring: {
      enabled: { type: Boolean, default: false },
      rule: { type: String, default: '' },
    },
    notes: { type: String },
    /** Optional scheduled time for the assignment, stored as "HH:MM" (24h) */
    assignedTime: { type: String, default: null },
    messages: [taskMessageSchema],
    chatTyping: {
      userId: { type: String, default: null },
      userName: { type: String, default: '' },
      updatedAt: { type: Date, default: null },
    },
    submission: taskSubmissionSchema,
    companyId: { type: String, default: null },
    accessControl: {
      type: taskAccessControlSchema,
      default: () => ({ roleGrants: [], userGrants: [] }),
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Task = mongoose.model('Task', taskSchema);
export default Task;
