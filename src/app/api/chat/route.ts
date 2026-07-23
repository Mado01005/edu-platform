export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Ordered fallback chain of verified free multimodal (Vision) models on OpenRouter.
// We use a broader list to account for OpenRouter's frequent free-tier availability changes.
const FREE_MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'google/gemma-3-27b-it:free',
];

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

    // Inject tutor persona into the first user message for universal model compatibility.
    const TUTOR_PROMPT = `# ROLE
You are the "EduPortal Materials Expert," a high-level academic tutor for engineering students. Your goal is to simplify complex material science concepts without losing technical rigor.

# DOMAIN EXPERTISE
- Atomic bonding, Crystallography (BCC, FCC, HCP), and Miller Indices.
- Mechanical properties (Stress-Strain, Hardness, Creep, Fatigue).
- Phase Diagrams (Eutectic points, Lever rule, Iron-Carbon system).
- Material classes: Metals, Ceramics, Polymers, and Composites.

# PEDAGOGICAL GUIDELINES
1. **Socratic Scaffolding:** If a student asks a "how-to" problem, don't just give the answer. Break the problem into its fundamental physical principles first.
2. **Visual Descriptions:** Since you are text-based, use descriptive language to explain what a student should see in a phase diagram or a stress-strain curve.
3. **Encouraging Tone:** Use phrases like "Great question," or "Let’s look at this step-by-step" to maintain a supportive EduPortal environment.

# OUTPUT FORMATTING
- Use **bolding** for key terms (e.g., **yield strength**).
- Use LaTeX for all engineering formulas: $$\\sigma = \\frac{F}{A}$$
- Use bullet points for comparing material properties.
- **CRITICAL**: Keep responses concise. If a concept is broad, ask the student if they want to dive deeper into a specific sub-topic.`;

    // Process messages into OpenRouter multimodal format if images are present
    const fullMessages = messages.map((m: any, i: number) => {
      let textContent = m.content;

      // Prepend instructions to the first message
      if (i === 0 && m.role === 'user') {
        textContent = `[Instructions: ${TUTOR_PROMPT}]\n\nStudent question: ${textContent}`;
      }

      // If this message has an associated image (base64)
      if (m.image) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: textContent },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        };
      }

      return { role: m.role, content: textContent };
    });

    // Try each model in the fallback chain until one succeeds
    let lastError = '';
    for (const model of FREE_MODELS) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'EduPortal',
        },
        body: JSON.stringify({
          model,
          messages: fullMessages,
          temperature: 0.7,
          stream: true,
        }),
      });

      if (response.ok) {
        return new Response(response.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      if (response.status === 429 || response.status === 503 || response.status === 400) {
        lastError = `${model} → HTTP ${response.status}`;
        console.warn(`[CHAT] ${model} failed (${response.status}), trying next fallback...`);
        continue;
      }

      const errorBody = await response.text();
      throw new Error(`OpenRouter HTTP ${response.status}: ${errorBody}`);
    }

    throw new Error(`All free models are temporarily rate-limited. Last: ${lastError}. Please try again in a few seconds.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("🔥 [FATAL SERVER ERROR] /api/chat:", errorMessage);

    return new Response(errorMessage, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}
