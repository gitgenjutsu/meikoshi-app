import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

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
        description: "Onyomi in Katakana, or empty string",
      },
      kunyomi: {
        type: SchemaType.STRING,
        description: "Kunyomi in Hiragana, or empty string",
      },
      meanings: {
        type: SchemaType.STRING,
        description: "English meanings separated by semicolons",
      },
      reading: {
        type: SchemaType.STRING,
        description: "Primary hiragana/katakana reading",
      },
      strokes: {
        type: SchemaType.INTEGER,
        description: "Number of strokes, default 0 if unknown",
      },
      example_ja: {
        type: SchemaType.STRING,
        description: "Example word or sentence using the kanji",
      },
      example_en: {
        type: SchemaType.STRING,
        description: "English translation of the example",
      },
    },
    required: ["character", "meanings"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const level = (formData.get("level") as string) || "N5";

    // Read either lesson_number or chapterNumber from formData safely
    const rawLesson =
      (formData.get("lesson_number") as string) ||
      (formData.get("chapterNumber") as string);
    const parsedLesson = parseInt(rawLesson, 10);
    const lessonNumber = isNaN(parsedLesson) ? 1 : parsedLesson;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No image files provided." },
        { status: 400 },
      );
    }

    const imageParts = await Promise.all(
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

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: kanjiSchema as unknown as Schema,
      },
    });

    const prompt = `Extract all Kanji characters from the provided textbook pages. For each Kanji, extract the character itself, onyomi, kunyomi, English meanings, primary reading, stroke count if present, and an example word or sentence in Japanese with its English translation.`;

    const result = await model.generateContent([prompt, ...imageParts]);
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
      example_ja: item.example_ja || null,
      example_en: item.example_en || null,
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
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
