import {
  buildPrompt,
  needsMoreInfoMessage,
  type AiBriefInput,
} from "@/lib/ai-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export async function POST(request: Request): Promise<Response> {
  let input: AiBriefInput | undefined;
  try {
    const body = (await request.json()) as { input?: AiBriefInput };
    input = body.input;
  } catch {
    return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  if (!input || !Array.isArray(input.stays)) {
    return Response.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  // Never spend a model call (or risk a confident pick) on thin data.
  if (!input.reliable) {
    return Response.json({
      ok: true,
      source: "gated",
      text: needsMoreInfoMessage(input),
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, code: "not_configured" },
      { status: 503 }
    );
  }

  const { system, user } = buildPrompt(input);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });

    if (!response.ok) {
      return Response.json(
        { ok: false, code: "provider_error" },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return Response.json({ ok: false, code: "no_data" }, { status: 502 });
    }

    return Response.json({ ok: true, source: "openai", text });
  } catch {
    return Response.json(
      { ok: false, code: "provider_error" },
      { status: 502 }
    );
  }
}
