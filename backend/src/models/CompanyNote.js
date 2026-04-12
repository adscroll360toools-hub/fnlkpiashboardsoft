import mongoose from 'mongoose';

const companyNoteSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, default: '' },
    folder: { type: String, default: 'General', trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
    shareEveryone: { type: Boolean, default: false },
    shareUserIds: { type: [String], default: [] },
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

companyNoteSchema.index({ companyId: 1, folder: 1, pinned: -1, updated_at: -1 });

const CompanyNote = mongoose.model('CompanyNote', companyNoteSchema);
export default CompanyNote;
