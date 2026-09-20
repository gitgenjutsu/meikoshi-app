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
      You are a senior Japanese language instructor at a JLPT institute creating official "Bunpo Check" (文法チェック) unit test papers for Minna no Nihongo lessons.

      Analyze the provided textbook image(s) (e.g., Renshuu B, Renshuu C, or Grammar Explanations). Your goal is NOT to simply OCR the textbook, but to TRANSFORMATIONALLY GENERATE 8 to 12 classroom-style A/B binary choice test questions based on the exact grammar points introduced in that lesson.

      Follow these strict test-design guidelines based on official exam structures:

      1. CORE GRAMMAR FORM TARGETING:
        - Identify the primary grammar focus of the chapter (e.g., L35 conditional 〜ば/〜なら, L37 passive 〜れる/〜られる, L38 nominalization 〜の/〜こと).
        - Create binary choice pairs (Option A vs Option B) that pit the CORRECT rule against a COMMON STUDENT CONJUGATION ERROR:
          * Example (i-Adj Conditional): 新しければ vs 新しいければ
          * Example (Passive Conjugation): 聞かれました vs 聞かられました
          * Example (Transitive/Intransitive): 起きます vs 起こします
          * Example (Particle Selection): から vs で (materials), に vs で (events/locations)

      2. TRANSFORMATION PATTERNS (ACTIVE TO PASSIVE / INDIRECT):
        - Include sentence transformation items when applicable. Format the prompt/context clearly inside sentence_pre:
          * Example: "兄は私の日記を読みました。 → [?] 兄に日記を読まれました。" 
          * Options: a) 私は  b) 私の日記は

      3. DIALOGUE & CONTEXTUAL REASONING:
        - For items testing adverbs, sentence-ending expressions, or interrogatives, construct 2-speaker dialogues (A: ... / B: ...):
          * A: 春になれば、このへんで花見ができますよ。
          * B: そうですか。それは [ たのしい / たのしみ ] です。

      4. STRUCTURAL REQUIREMENTS:
        - Split complex textbook concepts into crisp, single-target binary choices (a) vs (b).
        - Ensure furigana readings are included in standard bracket format: 漢字[かんじ].
        - Provide the specific grammar rule reference name in grammar_rule_ref (e.g., "L35: Conditionals (~ば)", "L37: Passive Agent Particle (によって)").
        - Provide clear, concise explanations in English for why the chosen option is correct.

      Output strictly valid JSON matching the required schema.
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
