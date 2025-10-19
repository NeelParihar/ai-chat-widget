import { Handler } from "@netlify/functions";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const model = google("gemini-flash-latest");

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(event.headers?.origin),
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { messages, context, lang } = (body ?? {}) as {
      messages?: { role: "user" | "assistant" | "system"; content: string }[];
      context?: string;
      lang?: string;
    };

    const conversation = (messages ?? [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const systemInstruction = [
      "You are an embedded website assistant widget.",
      context ? `Context from host site: ${context}` : undefined,
      lang ? `Respond in language code: ${lang}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    const { text } = await generateText({
      model,
      prompt: `${systemInstruction}\n\nConversation so far:\n${conversation}\n\nASSISTANT:`,
    });

    return {
      statusCode: 200,
      headers: corsHeaders(event.headers?.origin),
      body: JSON.stringify({ reply: text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(event.headers?.origin),
      body: JSON.stringify({ error: "Failed to generate response" }),
    };
  }
};

function corsHeaders(origin?: string) {
  const o = origin ?? "*";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
