import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const model = google("gemini-flash-latest");

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, context, lang } = req.body as {
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

    res.json({ reply: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 8788;
app.listen(port, () => {
  console.log(`[server] running on http://localhost:${port}`);
});
