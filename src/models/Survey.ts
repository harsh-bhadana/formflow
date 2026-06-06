import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISurvey extends Document {
  workspaceId: Types.ObjectId;
  title: string;
  promptUsed?: string;
  schemaFields: Record<string, any>[]; // Array of Mixed BSON Objects representing form fields
  views: number;
  submissionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SurveySchema: Schema = new Schema(
  {
    workspaceId: { 
      type: Schema.Types.ObjectId, 
      required: true, 
      index: true // Strict tenant index pointer for strict isolation
    },
    title: { 
      type: String, 
      required: true 
    },
    promptUsed: { 
      type: String 
    },
    schemaFields: { 
      type: [Schema.Types.Mixed], 
      default: [] 
    },
    views: { 
      type: Number, 
      default: 0 
    },
    submissionsCount: { 
      type: Number, 
      default: 0 
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

// Compound index just in case we fetch surveys by workspace ordered by creation date
SurveySchema.index({ workspaceId: 1, createdAt: -1 });

export default mongoose.models.Survey || mongoose.model<ISurvey>('Survey', SurveySchema);
