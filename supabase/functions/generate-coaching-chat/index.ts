import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { OpenAI } from 'https://deno.land/x/openai/mod.ts';

const BANT_DEFINITION = 'BANT: Budget, Authority, Need, Timeline. A framework for qualifying leads.';
const MEDDIC_DEFINITION = 'MEDDIC: Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion. A methodology for complex sales.';
const SPICED_DEFINITION = 'SPICED: Situation, Pain, Impact, Critical Event, Decision. A framework for understanding customer needs.';

serve(async (req) => {
  try {
    const { recordingId, userMessage, methodology, coachingEvaluation } = await req.json();

    const systemPrompt = `
      You are an AI sales coach. Your goal is to provide actionable advice to a BDR based on their call recording.
      Analyze the provided coaching evaluation and answer the user's question.
      Frame your answer using the ${methodology} methodology.

      Coaching Evaluation:
      ${JSON.stringify(coachingEvaluation, null, 2)}

      Sales Methodologies:
      - ${BANT_DEFINITION}
      - ${MEDDIC_DEFINITION}
      - ${SPICED_DEFINITION}
    `;

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    });

    const responseStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(new TextEncoder().encode(content));
        }
        controller.close();
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
