import { createVertex } from '@ai-sdk/google-vertex';
import { z } from 'zod';

// Zod schemas representing the structured output expected from Vertex AI
export const SurveyFieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
});

export const SurveyFieldSchema = z.object({
  id: z.string().describe("Unique lowercase alphanumeric slug (e.g. 'full_name', 'email_address', 'satisfaction_rating')"),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'select',
    'multiselect',
    'radio',
    'rating',
    'boolean',
    'email',
    'date',
  ]).describe("The input type of the field"),
  label: z.string().describe("The friendly question or prompt displayed to the respondent"),
  placeholder: z.string().optional().describe("Optional input placeholder text (only for text, textarea, number, email, date)"),
  required: z.boolean().describe("Whether the respondent must fill this field"),
  options: z.array(z.string()).optional().describe("Options list for choice-based fields (select, multiselect, radio)"),
  validation: SurveyFieldValidationSchema.optional().describe("Constraints like min/max for ratings/numbers"),
});

export const SurveyGenerationSchema = z.object({
  title: z.string().describe("Clean and professional title for the generated survey"),
  description: z.string().optional().describe("A concise sub-heading or description explaining the survey's goal"),
  fields: z.array(SurveyFieldSchema).describe("List of questions and fields generated based on the user request"),
});

export type SurveyFieldType = z.infer<typeof SurveyFieldSchema>;
export type SurveyGenerationType = z.infer<typeof SurveyGenerationSchema>;

// Vertex Provider Setup
const hasCredentials = !!(
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
);

const project = process.env.VERTEX_PROJECT;
const location = process.env.VERTEX_LOCATION || 'us-central1';

export const isVertexConfigured = hasCredentials || !!project;

// Instantiate the custom Vertex provider if configured
let vertexProvider: ReturnType<typeof createVertex> | null = null;

if (isVertexConfigured) {
  const googleAuthOptions = (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
    ? {
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      }
    : undefined;

  vertexProvider = createVertex({
    project,
    location,
    googleAuthOptions,
  });
}

/**
 * Returns a configured model instance for Vertex AI.
 * If not configured, returns null (so fallback generation can be used).
 */
export function getVertexModel() {
  if (!vertexProvider) return null;
  const modelName = process.env.VERTEX_MODEL || 'gemini-1.5-flash';
  return vertexProvider(modelName);
}

/**
 * Generates a mock survey response offline.
 * This ensures developers can test the generation pipelines locally without Google Cloud credentials.
 */
export async function generateMockSurvey(prompt: string): Promise<SurveyGenerationType> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const cleanPrompt = prompt.trim() || 'General Feedback';
  const displayTitle = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 47)}...` : cleanPrompt;
  const capitalizedTitle = `${displayTitle.charAt(0).toUpperCase()}${displayTitle.slice(1)}`;

  // Basic context parsing to make mock generation feel slightly responsive to prompt content
  const promptLower = cleanPrompt.toLowerCase();
  
  if (promptLower.includes('coffee') || promptLower.includes('cafe') || promptLower.includes('restaurant')) {
    return {
      title: `${capitalizedTitle} Survey`,
      description: "We would love to hear your thoughts on your recent dining experience with us.",
      fields: [
        {
          id: "visit_frequency",
          type: "radio",
          label: "How often do you visit our coffee shop?",
          required: true,
          options: ["Daily", "Weekly", "Monthly", "Rarely"],
        },
        {
          id: "service_rating",
          type: "rating",
          label: "How would you rate the quality of our customer service?",
          required: true,
          validation: { min: 1, max: 5 },
        },
        {
          id: "favorite_item",
          type: "text",
          label: "What is your favorite item on our menu?",
          placeholder: "e.g., Caramel Macchiato",
          required: false,
        },
        {
          id: "additional_feedback",
          type: "textarea",
          label: "Do you have any suggestions or additional comments?",
          placeholder: "Your feedback...",
          required: false,
        },
      ],
    };
  }

  if (promptLower.includes('course') || promptLower.includes('class') || promptLower.includes('training') || promptLower.includes('student')) {
    return {
      title: `${capitalizedTitle} Evaluation`,
      description: "Thank you for completing the course. Please rate your instructor and material.",
      fields: [
        {
          id: "instructor_rating",
          type: "rating",
          label: "How effective was the instructor in delivering the material?",
          required: true,
          validation: { min: 1, max: 5 },
        },
        {
          id: "difficulty_level",
          type: "select",
          label: "How would you describe the difficulty level of the course?",
          required: true,
          options: ["Too Easy", "Appropriate", "Too Challenging"],
        },
        {
          id: "recommend_course",
          type: "boolean",
          label: "Would you recommend this course to other students?",
          required: true,
        },
        {
          id: "improvement_suggestions",
          type: "textarea",
          label: "What could be improved in future sessions?",
          placeholder: "Comments...",
          required: false,
        },
      ],
    };
  }

  // Default mock survey
  return {
    title: `${capitalizedTitle} Survey`,
    description: "Thank you for taking the time to share your feedback. We appreciate your input.",
    fields: [
      {
        id: "satisfaction_score",
        type: "rating",
        label: "How satisfied are you with our product/service?",
        required: true,
        validation: { min: 1, max: 5 },
      },
      {
        id: "nps_score",
        type: "radio",
        label: "How likely are you to recommend us to a friend or colleague?",
        required: true,
        options: ["Extremely likely", "Likely", "Neutral", "Unlikely", "Extremely unlikely"],
      },
      {
        id: "usage_duration",
        type: "select",
        label: "How long have you been using our product?",
        required: true,
        options: ["Less than a month", "1-6 months", "6-12 months", "More than a year"],
      },
      {
        id: "comments",
        type: "textarea",
        label: "Please share any additional thoughts or feedback you have.",
        placeholder: "Your comments here...",
        required: false,
      },
    ],
  };
}
