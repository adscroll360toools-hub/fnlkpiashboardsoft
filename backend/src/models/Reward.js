import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    eligibleRole: { type: String, default: null },
    eligibleEmployeeId: { type: String, default: null },
    createdById: { type: String, default: '' },
    createdByName: { type: String, default: '' },
    rewardType: {
      type: String,
      enum: ['bonus', 'certificate', 'recognition', 'gift'],
      default: 'recognition',
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

const Reward = mongoose.model('Reward', rewardSchema);
export default Reward;
