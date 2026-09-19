// lib/gemini.ts
import { GenerativeModel, Part } from "@google/generative-ai";

export class GeminiServiceSpikeError extends Error {
  constructor() {
    super(
      "API is currently experiencing high demand. Please try again in a few moments.",
    );
    this.name = "GeminiServiceSpikeError";
  }
}

/**
 * Wraps model.generateContent to gracefully identify and raise service spikes (503/429).
 */
export async function generateContentWithSpikeCheck(
  model: GenerativeModel,
  contents: Array<string | Part>,
) {
  try {
    return await model.generateContent(contents);
  } catch (error: any) {
    const errorMessage = error?.message || "";
    const statusCode = error?.status;

    // Detect 503 (High Demand) or 429 (Rate Limit)
    if (
      statusCode === 503 ||
      statusCode === 429 ||
      errorMessage.includes("503") ||
      errorMessage.includes("Service Unavailable") ||
      errorMessage.includes("high demand") ||
      errorMessage.includes("429") ||
      errorMessage.includes("Quota exceeded")
    ) {
      throw new GeminiServiceSpikeError();
    }

    throw error;
  }
}
