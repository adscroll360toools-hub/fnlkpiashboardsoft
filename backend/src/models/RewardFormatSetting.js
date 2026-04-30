import mongoose from 'mongoose';

const rewardFormatSettingSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    format: {
      type: String,
      enum: ['bonus', 'certificate', 'recognition'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

rewardFormatSettingSchema.index({ companyId: 1, format: 1 }, { unique: true });

const RewardFormatSetting = mongoose.model('RewardFormatSetting', rewardFormatSettingSchema);
export default RewardFormatSetting;
