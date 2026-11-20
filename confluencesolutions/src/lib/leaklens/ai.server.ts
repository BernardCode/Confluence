import { createOpenAI } from "@ai-sdk/openai";
import { streamText, APICallError } from "ai";

export type DraftInput = { segment: string; area: string; minPsi: number; durationMin: number; notes: string };
export type DraftResult = { ok: true; advisory: string; samplingPlan: string } | { ok: false; status: number; error: string };

export async function draftWithLovableAI(input: DraftInput): Promise<DraftResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, status: 401, error: "AI is not configured." };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  try {
    const result = streamText({
      model: provider.responses("openai/gpt-6.1-sol"),
      maxRetries: 0,
      system:
        "You draft precautionary water-utility documents for a student DEMO. Everything is SIMULATED. Never claim health outcomes, regulatory compliance or certification. Plain language, under 90 words for the advisory. Output exactly two sections: the advisory text, then a line '---SAMPLING PLAN---', then a numbered sampling plan (3-5 steps) naming flushing, upstream/downstream sample points and chlorine residual.",
      prompt: `Segment: ${input.segment} (${input.area}). Sustained low pressure, minimum ${input.minPsi} psi for about ${input.durationMin} minutes after a simulated main break near a leaking pipe. Operator notes: ${input.notes || "none"}.`,
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] } },
    });
    const text = await result.text;
    const [advisory, plan] = text.split("---SAMPLING PLAN---");
    if (!advisory?.trim()) return { ok: false, status: 502, error: "The AI returned no draft. Keep editing manually." };
    return { ok: true, advisory: advisory.trim(), samplingPlan: (plan ?? "").trim() };
  } catch (e) {
    const status = APICallError.isInstance(e) ? (e.statusCode ?? 500) : 500;
    const msg =
      status === 402 ? "Lovable AI credits are used up. Add credits in Settings → Plans & credits."
      : status === 429 ? "Too many AI requests right now. Wait a moment and try again."
      : status === 403 ? "AI access is blocked for this workspace."
      : "The AI draft failed. You can still edit the draft manually.";
    return { ok: false, status, error: msg };
  }
}
