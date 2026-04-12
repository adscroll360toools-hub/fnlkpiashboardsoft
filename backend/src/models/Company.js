// backend/src/models/Company.js
import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    adminPassword: { type: String, required: true },
    plan: {
      type: String,
      enum: ['Starter', 'Enterprise', 'Global'],
      default: 'Starter',
    },
    status: {
      type: String,
      enum: ['Active', 'Suspended'],
      default: 'Active',
    },
    industry: { type: String, trim: true },
    website: { type: String, trim: true },
    employeeLimit: { type: Number, default: 50 },
    attendanceSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        workStart: '09:00',
        workEnd: '18:00',
        lateAfterMinutes: 15,
        absentIfNoCheckInBy: '10:30',
      }),
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

const Company = mongoose.model('Company', companySchema);
export default Company;
