// backend/src/models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkInTime: { type: String, default: null },
    checkOutTime: { type: String, default: null },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Leave', 'Break', '—'],
      default: '—',
    },
    breakStartTime: { type: String, default: null },
    breakEndTime: { type: String, default: null },
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

// Compound unique index (user can have only one record per day)
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
