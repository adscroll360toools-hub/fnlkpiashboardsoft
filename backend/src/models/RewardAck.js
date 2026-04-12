import mongoose from 'mongoose';

const rewardAckSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    rewardId: { type: String, required: true },
  },
  { timestamps: { createdAt: 'acknowledged_at', updatedAt: false } }
);

rewardAckSchema.index({ companyId: 1, userId: 1, rewardId: 1 }, { unique: true });

const RewardAck = mongoose.model('RewardAck', rewardAckSchema);
export default RewardAck;
