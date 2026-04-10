// backend/src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'controller', 'employee'],
      default: 'employee',
    },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    score: { type: Number, default: 0 },
    companyId: { type: String, default: null },
    companyRoleId: { type: String, default: null },
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

const User = mongoose.model('User', userSchema);
export default User;
