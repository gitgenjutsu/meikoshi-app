import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import {
  generateContentWithSpikeCheck,
  GeminiServiceSpikeError,
} from "@/lib/gemini";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const bunpoSchema = {
  type: SchemaType.ARRAY,
  description:
    "A binary-choice Japanese grammar quiz mirroring classroom tests.",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      question_number: { type: SchemaType.INTEGER },
      sentence_pre: {
        type: SchemaType.STRING,
        description:
          "Text before the blank/choice. Include furigana in brackets e.g. 英語[えいご]は",
      },
      sentence_post: {
        type: SchemaType.STRING,
        description: "Text after the blank/choice e.g. 書[か]かれました。",
      },
      option_a: { type: SchemaType.STRING, description: "Option A text" },
      option_b: { type: SchemaType.STRING, description: "Option B text" },
      correct_option: {
        type: SchemaType.STRING,
        description: "Must be 'a' or 'b'",
      },
      grammar_rule_ref: {
        type: SchemaType.STRING,
        description: "Target rule, e.g. 'N から / N で つくります'",
      },
      explanation: {
        type: SchemaType.STRING,
        description: "Brief English explanation of why the answer is correct",
      },
      example_sentence: {
        type: SchemaType.STRING,
        description: "Clear key pattern example sentence with furigana",
      },
    },
    required: [
      "question_number",
      "sentence_pre",
      "option_a",
      "option_b",
      "correct_option",
      "grammar_rule_ref",
      "explanation",
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const lessonNumber = formData.get("lesson_number") as string;
    const level = (formData.get("level") as string) || "N4";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 },
      );
    }

    const imageParts = await Promise.all(
      files.map(async (file) => ({
        inlineData: {
          data: Buffer.from(await file.arrayBuffer()).toString("base64"),
          mimeType: file.type || "image/jpeg",
        },
      })),
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: bunpoSchema as unknown as Schema,
      },
    });

    const prompt = `
Extract and generate a complete binary-choice classroom grammar test (文法チェック) for Lesson ${lessonNumber} based on the attached textbook grammar notes and exercises.

RULES:
1. Generate questions where students pick between option_a or option_b (e.g. passive vs active verbs, particle choices like から vs で, に vs を).
2. Attach Furigana in square brackets for ALL Kanji in sentence_pre, sentence_post, option_a, option_b, and example_sentence (e.g. 飛行機[ひこうき]).
3. Set correct_option to strictly 'a' or 'b'.
4. Provide a clear grammar_rule_ref and explanation for post-quiz review.
`;

    const result = await generateContentWithSpikeCheck(model, [
      prompt,
      ...imageParts,
    ]);
    const extractedQuiz = JSON.parse(result.response.text());

    const rowsToInsert = extractedQuiz.map((q: any) => ({
      level,
      lesson_number: Number(lessonNumber),
      question_number: Number(q.question_number),
      sentence_pre: q.sentence_pre,
      sentence_post: q.sentence_post || "",
      option_a: q.option_a,
      option_b: q.option_b,
      correct_option: q.correct_option.toLowerCase(),
      grammar_rule_ref: q.grammar_rule_ref || "",
      explanation: q.explanation || "",
      example_sentence: q.example_sentence || "",
    }));

    const { data, error } = await supabase
      .from("jlpt_bunpo_tests")
      .upsert(rowsToInsert, { onConflict: "lesson_number,question_number" })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (err: any) {
    if (err instanceof GeminiServiceSpikeError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Extraction failed" },
      { status: 500 },
    );
  }
}
