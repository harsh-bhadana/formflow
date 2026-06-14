import { NextResponse } from 'next/server';
import { streamText, Output } from 'ai';
import { getVertexModel, isVertexConfigured, SurveyGenerationSchema } from '@/src/lib/vertex';
import { auth } from '@/src/lib/auth';
import { headers } from 'next/headers';
import { dbConnect } from '@/src/lib/db';

export const runtime = 'nodejs'; // Ensure Node.js runtime for MongoDB support

export async function POST(req: Request) {
  try {
    // 1. Authenticate the request session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Please sign in first.' }, { status: 401 });
    }

    // 2. Parse request payload
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    // 3. Connect to database
    await dbConnect();

    // 4. If Google Vertex is configured, stream the live generative output
    if (isVertexConfigured) {
      const model = getVertexModel();
      if (model) {
        try {
          const result = streamText({
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

          return result.toTextStreamResponse();
        } catch (error) {
          console.error('Vertex AI streaming encountered an error, falling back to mock stream:', error);
        }
      }
    }

    // 5. Fallback: Stream a mock survey structure with artificial delays
    // This allows the frontend streaming preview hook to be tested seamlessly.
    const mockSurvey = await import('@/src/lib/vertex').then((m) => m.generateMockSurvey(prompt));
    const mockString = JSON.stringify(mockSurvey);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const chunkSize = 20; // Send 20 characters at a time
        let offset = 0;

        while (offset < mockString.length) {
          const chunk = mockString.slice(offset, offset + chunkSize);
          controller.enqueue(encoder.encode(chunk));
          offset += chunkSize;
          // Small delay to simulate progressive generation
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('API Route /api/surveys/generate caught exception:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during streaming.' },
      { status: 500 }
    );
  }
}
