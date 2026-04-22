import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY in environment variables.");
    }

    const bodyText = await req.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      throw new Error(`Failed to parse request JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Body received: ${bodyText.substring(0, 100)}`);
    }

    const { messages } = body;
    if (!messages) throw new Error("No messages provided in the request body.");

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'EduPortal',
      }
    });

    const result = await streamText({
      // @ts-expect-error - compatibility between ai@3 and newer provider utils
      model: openrouter('meta-llama/llama-3-8b-instruct:free'),
      messages,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("🔥 [FATAL SERVER ERROR] /api/chat:", errorMessage);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    
    // Return the exact error message text to the client
    return new Response(errorMessage, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
