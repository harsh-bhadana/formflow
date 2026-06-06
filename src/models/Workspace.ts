import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  createdAt: Date;
}

const WorkspaceSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true }, // For tenant-scoped subroutes (e.g., dashboard/tenant-slug)
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
