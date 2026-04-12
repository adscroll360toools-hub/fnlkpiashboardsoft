import mongoose from 'mongoose';

const standupSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, default: '' },
    standupDate: { type: String, required: true },
    yesterdayWork: { type: String, required: true, trim: true },
    todayPlan: { type: String, required: true, trim: true },
    blockers: { type: String, default: 'None', trim: true },
    submittedAt: { type: Date, default: Date.now },
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

standupSchema.index({ companyId: 1, userId: 1, standupDate: 1 }, { unique: true });

const Standup = mongoose.model('Standup', standupSchema);
export default Standup;
