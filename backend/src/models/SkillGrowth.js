import mongoose from 'mongoose';

const skillGrowthSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    role: { type: String, default: '' },
    skill: { type: String, required: true, trim: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    target: { type: Number, default: 100, min: 1, max: 100 },
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

skillGrowthSchema.index({ companyId: 1, created_at: -1 });

const SkillGrowth = mongoose.model('SkillGrowth', skillGrowthSchema);
export default SkillGrowth;
