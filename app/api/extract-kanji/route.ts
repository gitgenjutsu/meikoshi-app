import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  generateContentWithSpikeCheck,
  GeminiServiceSpikeError,
} from "@/lib/gemini";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const kanjiSchema = {
  type: SchemaType.ARRAY,
  description: "Extracted Kanji entries from textbook image",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      character: {
        type: SchemaType.STRING,
        description: "Kanji character, e.g., 水",
      },
      onyomi: {
        type: SchemaType.STRING,
        description: "Onyomi in Katakana, e.g., スイ, or empty string if none",
      },
      kunyomi: {
        type: SchemaType.STRING,
        description: "Kunyomi in Hiragana, e.g., みず, or empty string if none",
      },
      meanings: {
        type: SchemaType.STRING,
        description: "English meanings separated by semicolons, e.g., water",
      },
      reading: {
        type: SchemaType.STRING,
        description: "Primary hiragana/katakana reading",
      },
      strokes: {
        type: SchemaType.INTEGER,
        description: "Number of strokes, default 0 if unknown",
      },
      vocabulary: {
        type: SchemaType.ARRAY,
        description:
          "The 4 vocabulary words (単語) listed for this Kanji in the textbook",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            word: {
              type: SchemaType.STRING,
              description: "Kanji vocabulary word, e.g., 水着",
            },
            reading: {
              type: SchemaType.STRING,
              description: "Kana reading in Hiragana/Katakana, e.g., みずぎ",
            },
            meaning: {
              type: SchemaType.STRING,
              description:
                "English meaning of the vocabulary word, e.g., swimsuit",
            },
            example_ja: {
              type: SchemaType.STRING,
              description:
                "Short example sentence in Japanese using the word, with HTML <ruby> and <rt> tags for Furigana.",
            },
            example_en: {
              type: SchemaType.STRING,
              description: "English translation of the example sentence.",
            },
          },
          required: ["word", "reading", "meaning", "example_ja", "example_en"],
        },
      },
    },
    required: ["character", "meanings", "vocabulary"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let level = "N5";
    let lessonNumber = 1;
    let imageParts: { inlineData: { data: string; mimeType: string } }[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      level = body.level || "N5";
      const rawLesson = body.lesson_number || body.chapterNumber;
      lessonNumber = parseInt(rawLesson, 10) || 1;

      const rawImages: string[] = body.images || [];

      if (!rawImages || rawImages.length === 0) {
        return NextResponse.json(
          { success: false, error: "No image files provided." },
          { status: 400 },
        );
      }

      imageParts = rawImages.map((base64Str) => ({
        inlineData: {
          data: base64Str.includes(",") ? base64Str.split(",")[1] : base64Str,
          mimeType: "image/jpeg",
        },
      }));
    } else {
      const formData = await req.formData();
      const files = formData
        .getAll("files")
        .concat(formData.getAll("images")) as File[];
      level = (formData.get("level") as string) || "N5";

      const rawLesson =
        (formData.get("lesson_number") as string) ||
        (formData.get("chapterNumber") as string);
      const parsedLesson = parseInt(rawLesson, 10);
      lessonNumber = isNaN(parsedLesson) ? 1 : parsedLesson;

      if (!files || files.length === 0) {
        return NextResponse.json(
          { success: false, error: "No image files provided." },
          { status: 400 },
        );
      }

      imageParts = await Promise.all(
        files.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          return {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: file.type || "image/jpeg",
            },
          };
        }),
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: kanjiSchema as unknown as Schema,
      },
    });

    const prompt = `
Extract all Kanji entries from the provided textbook pages. 
For each Kanji character:
1. Extract character, onyomi, kunyomi, meanings, primary reading, and stroke count.
2. Extract all 4 vocabulary compounds (単語) provided for the Kanji.
3. For each vocabulary word, include its reading (Kana), English meaning, a short Japanese sentence using <ruby> and <rt> tags for furigana on kanji, and its English translation.
    `.trim();

    // Wrapped execution check
    const result = await generateContentWithSpikeCheck(model, [
      prompt,
      ...imageParts,
    ]);
    const responseText = result.response.text();
    const extractedData = JSON.parse(responseText);

    if (!Array.isArray(extractedData) || extractedData.length === 0) {
      return NextResponse.json(
        { success: false, error: "No Kanji could be parsed from the image." },
        { status: 422 },
      );
    }

    const rowsToInsert = extractedData.map((item) => ({
      level,
      lesson_number: lessonNumber,
      character: item.character,
      onyomi: item.onyomi || null,
      kunyomi: item.kunyomi || null,
      meanings: item.meanings,
      reading: item.reading || item.kunyomi || item.onyomi || null,
      strokes: item.strokes || null,
      vocabulary: item.vocabulary || [],
      example_ja: item.vocabulary?.[0]?.example_ja || null,
      example_en: item.vocabulary?.[0]?.example_en || null,
    }));

    const { data: inserted, error: dbError } = await supabase
      .from("jlpt_kanji")
      .insert(rowsToInsert)
      .select();

    if (dbError) {
      console.error("Database error inserting Kanji:", dbError);
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      count: inserted.length,
      data: inserted,
    });
  } catch (err: any) {
    console.error("Extract Kanji error:", err);

    if (err instanceof GeminiServiceSpikeError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
