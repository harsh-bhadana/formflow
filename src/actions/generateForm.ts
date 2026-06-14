'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { dbConnect } from '@/src/lib/db';
import Workspace from '@/src/models/Workspace';
import Survey from '@/src/models/Survey';
import { auth } from '@/src/lib/auth';
import {
  getVertexModel,
  generateMockSurvey,
  isVertexConfigured,
  SurveyGenerationSchema,
} from '@/src/lib/vertex';
import { generateText, Output } from 'ai';

interface GenerateSurveyInput {
  prompt: string;
  workspaceId?: string; // Optional, can be ObjectId or Slug
}

/**
 * Server Action to generate a structured survey using Vertex AI and save it to MongoDB.
 */
export async function generateSurveyAction(input: GenerateSurveyInput) {
  try {
    const { prompt, workspaceId } = input;

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return { success: false, error: 'Prompt is required.' };
    }

    // 1. Authenticate user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { success: false, error: 'Unauthorized: Please sign in to generate a survey.' };
    }

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Find or create workspace for tenant isolation
    let workspace = null;

    if (workspaceId) {
      if (mongoose.Types.ObjectId.isValid(workspaceId)) {
        workspace = await Workspace.findById(workspaceId);
      } else {
        workspace = await Workspace.findOne({ slug: workspaceId });
      }
    }

    // Onboarding fallback: If no workspace is specified or found, find any existing workspace
    // or create a default one to ensure the demo is functional out of the box.
    if (!workspace) {
      workspace = await Workspace.findOne();
      if (!workspace) {
        workspace = await Workspace.create({
          name: 'Personal Workspace',
          slug: 'personal-workspace',
        });
      }
    }

    // 4. Generate survey schema (Vertex AI or Fallback Mock)
    let surveyData;

    if (isVertexConfigured) {
      const model = getVertexModel();
      if (model) {
        try {
          const response = await generateText({
            model: model,
            output: Output.object({
              schema: SurveyGenerationSchema,
            }),
            system: `You are FormFlow AI, an expert survey designer. Create professional, engaging, and logical surveys based on the user's requirements. 
Guidelines:
- Keep field 'id' parameters short, alphanumeric, lowercase, using snake_case (e.g., 'visit_count', 'satisfaction_rating').
- Keep options clean and concise (limit choice options to at most 6 choices).
- Add validation min/max values for ratings or numeric ranges if appropriate.`,
            prompt: `Generate a structured survey for the following request: "${prompt}"`,
          });

          surveyData = response.output;
        } catch (error) {
          console.error('Vertex AI generation failed, falling back to mock generator:', error);
          surveyData = await generateMockSurvey(prompt);
        }
      } else {
        console.warn('Vertex AI model could not be loaded, falling back to mock generator.');
        surveyData = await generateMockSurvey(prompt);
      }
    } else {
      console.info('Vertex AI is not configured. Using mock survey generator fallback.');
      surveyData = await generateMockSurvey(prompt);
    }

    // 5. Persist the generated survey to MongoDB
    const survey = await Survey.create({
      workspaceId: workspace._id,
      title: surveyData.title,
      promptUsed: prompt,
      schemaFields: surveyData.fields,
      views: 0,
      submissionsCount: 0,
    });

    // 6. Revalidate dashboard cache paths
    revalidatePath(`/dashboard/${workspace.slug}`);
    revalidatePath(`/dashboard/${workspace.slug}/surveys`);

    return {
      success: true,
      survey: {
        id: survey._id.toString(),
        title: survey.title,
        promptUsed: survey.promptUsed || '',
        schemaFields: survey.schemaFields,
        workspaceId: survey.workspaceId.toString(),
        createdAt: survey.createdAt.toISOString(),
      },
      workspaceSlug: workspace.slug,
    };
  } catch (error: any) {
    console.error('generateSurveyAction caught an exception:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during survey generation.',
    };
  }
}
