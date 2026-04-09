// backend/src/models/BreakRequest.js
import mongoose from 'mongoose';

const breakRequestSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    reason: { type: String, required: true },
    sessionTime: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    requestedAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
    companyId: { type: String, default: null },
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

const BreakRequest = mongoose.model('BreakRequest', breakRequestSchema);
export default BreakRequest;
