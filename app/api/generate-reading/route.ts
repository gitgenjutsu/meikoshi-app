import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { supabase } from "@/lib/supabaseClient";
import {
  generateContentWithSpikeCheck,
  GeminiServiceSpikeError,
} from "@/lib/gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { level = "N4", forceNew = false } = await req.json();

    // 1. CHECK SUPABASE CACHE FIRST
    if (!forceNew) {
      const { data: cachedPassages, error: dbSelectError } = await supabase
        .from("jlpt_reading_passages")
        .select("*")
        .eq("level", level);

      if (!dbSelectError && cachedPassages && cachedPassages.length > 0) {
        const randomPassage =
          cachedPassages[Math.floor(Math.random() * cachedPassages.length)];
        return NextResponse.json({ source: "CACHE", data: randomPassage });
      }
    }

    // 2. GENERATE DYNAMIC PASSAGE WITH GEMINI
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is missing." },
        { status: 500 },
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title_en: { type: SchemaType.STRING },
            title_ja: { type: SchemaType.STRING },
            passage_type: { type: SchemaType.STRING },
            content_ja: { type: SchemaType.STRING },
            content_en: { type: SchemaType.STRING },
            vocabulary_breakdown: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  word: { type: SchemaType.STRING },
                  reading: { type: SchemaType.STRING },
                  meaning: { type: SchemaType.STRING },
                },
                required: ["word", "reading", "meaning"],
              },
            },
            questions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  question: { type: SchemaType.STRING },
                  prompt_en: { type: SchemaType.STRING },
                  options: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  correct_option_index: { type: SchemaType.INTEGER },
                  explanation: { type: SchemaType.STRING },
                },
                required: [
                  "id",
                  "question",
                  "prompt_en",
                  "options",
                  "correct_option_index",
                  "explanation",
                ],
              },
            },
          },
          required: [
            "title_en",
            "title_ja",
            "passage_type",
            "content_ja",
            "content_en",
            "vocabulary_breakdown",
            "questions",
          ],
        },
      },
    });

    const prompt = `
      Create a realistic JLPT ${level} Japanese reading comprehension passage about a daily situation (e.g., notice, casual chat, store announcement, or short email).
      
      CRITICAL INSTRUCTIONS:
      - In 'content_ja' and 'title_ja', format furigana strictly using bracket notation immediately following Kanji characters e.g. "映画[えいが]を見[み]に行[い]く". Do NOT wrap hiragana or okurigana inside brackets.
      - Vocabulary and grammar must strictly adhere to JLPT ${level} difficulty.
      - Provide 2 multiple choice questions in 'questions' with 4 options each.
    `;

    const result = await generateContentWithSpikeCheck(model, [prompt]);
    const passagePayload = JSON.parse(result.response.text());

    // 3. PERSIST GENERATED PASSAGE TO SUPABASE
    const { data: insertedData, error: insertError } = await supabase
      .from("jlpt_reading_passages")
      .insert({
        level,
        title_en: passagePayload.title_en,
        title_ja: passagePayload.title_ja,
        passage_type: passagePayload.passage_type,
        content_ja: passagePayload.content_ja,
        content_en: passagePayload.content_en,
        vocabulary_breakdown: passagePayload.vocabulary_breakdown,
        questions: passagePayload.questions,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase Reading Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      source: "GENERATED",
      data: insertedData,
    });
  } catch (error: any) {
    console.error("Reading Generation API Error:", error);

    if (error instanceof GeminiServiceSpikeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate passage." },
      { status: 500 },
    );
  }
}
