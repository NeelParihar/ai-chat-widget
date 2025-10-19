import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const model = google("gemini-1.5-flash");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { messages, context, lang } = (
      typeof req.body === "string" ? JSON.parse(req.body) : req.body
    ) as {
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

    res.status(200).json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate response" });
  }
}
