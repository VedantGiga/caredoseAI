import { logger } from "../lib/logger.js";

export interface ExtractedMedicine {
  name: string;
  dosage: string;
  frequency?: string;
  time?: string;
}

export interface PrescriptionParseResult {
  medicines: ExtractedMedicine[];
  rawText: string;
}

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];

export async function parsePrescriptionImage(
  imageBase64: string,
): Promise<PrescriptionParseResult> {
  if (!OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY not set, returning mock prescription data");
    return {
      medicines: [
        { name: "Amlodipine", dosage: "5mg", frequency: "daily", time: "morning" },
        { name: "Metformin", dosage: "500mg", frequency: "daily", time: "morning, evening" },
      ],
      rawText: "Mock OCR text - configure OPENAI_API_KEY for real parsing",
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a medical prescription parser. Analyze this prescription image and extract all medicines.
Return a JSON object with this exact structure:
{
  "medicines": [
    {"name": "MedicineName", "dosage": "dose", "frequency": "daily|twice|thrice|weekly", "time": "morning|evening|night|after_meals|before_meals"}
  ],
  "rawText": "extracted text from prescription"
}
Only include medications you can clearly identify. Be precise with dosages.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err }, "OpenAI API error");
    throw new Error("Failed to parse prescription");
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as PrescriptionParseResult;

  return {
    medicines: parsed.medicines ?? [],
    rawText: parsed.rawText ?? "",
  };
}
