// backend/src/models/CompanyRole.js
import mongoose from 'mongoose';

const defaultPermissions = () => ({
  tasks_create: false,
  tasks_assign: false,
  tasks_delete: false,
  users_manage: false,
  roles_manage: false,
  reports_view: true,
  kpi_manage: false,
  attendance_view: true,
});

const companyRoleSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    portalBase: { type: String, enum: ['employee', 'controller'], required: true },
    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: defaultPermissions,
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

const CompanyRole = mongoose.model('CompanyRole', companyRoleSchema);
export default CompanyRole;
