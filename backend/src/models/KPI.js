// backend/src/models/KPI.js
import mongoose from 'mongoose';

const kpiSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['Company', 'Group', 'Individual'],
      required: true,
    },
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    unit: { type: String, required: true },
    dailyMin: { type: Number },
    dailyMax: { type: Number },
    assignedToId: { type: String },
    assignedToName: { type: String },
    groupId: { type: String },
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

const KPI = mongoose.model('KPI', kpiSchema);
export default KPI;
