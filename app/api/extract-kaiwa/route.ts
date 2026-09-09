import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    const lessonNumber = (formData.get("lesson_number") ||
      formData.get("lessonNumber") ||
      formData.get("chapterNumber")) as string;

    const level = (formData.get("level") as string) || "N4";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No image files provided" },
        { status: 400 },
      );
    }

    if (!lessonNumber) {
      return NextResponse.json(
        { error: "Lesson number is required" },
        { status: 400 },
      );
    }

    const imageParts = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const base64Image = Buffer.from(bytes).toString("base64");
        return {
          inlineData: {
            data: base64Image,
            mimeType: file.type || "image/jpeg",
          },
        };
      }),
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          description: "List of Renshuu C exercises (3 per lesson)",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              exercise_number: {
                type: SchemaType.INTEGER,
                description: "Exercise number e.g. 1, 2, or 3",
              },
              grammar_point: {
                type: SchemaType.STRING,
                description: "Main grammar pattern focus",
              },
              dialogue_template: {
                type: SchemaType.OBJECT,
                properties: {
                  lines: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        speaker: {
                          type: SchemaType.STRING,
                          description: "Speaker label e.g., A, B",
                        },
                        text: {
                          type: SchemaType.STRING,
                          description:
                            "Base dialogue text with furigana in brackets and substituted targets wrapped in <u></u> e.g., いつも <u>電子辞書[でんしじしょ]</u>を 持[も]って いるんですか。",
                        },
                      },
                      required: ["speaker", "text"],
                    },
                  },
                },
                required: ["lines"],
              },
              variations: {
                type: SchemaType.ARRAY,
                description: "List of variations: れい (example), 1, and 2",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    var_number: {
                      type: SchemaType.STRING,
                      description: "'れい', '1', or '2'",
                    },
                    prompt_text: {
                      type: SchemaType.STRING,
                      description:
                        "Base prompt cues e.g. ① カメラ / ② おもしろい 物を見ます / ③ いつでも 写真が撮れます",
                    },
                    target_conjugation: {
                      type: SchemaType.STRING,
                      description:
                        "Target conjugation phrase with furigana e.g. 撮[と]れるように",
                    },
                    full_lines: {
                      type: SchemaType.ARRAY,
                      description:
                        "Complete reconstructed lines for ALL speakers for this variation",
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          speaker: {
                            type: SchemaType.STRING,
                            description: "Speaker label e.g., A, B",
                          },
                          text: {
                            type: SchemaType.STRING,
                            description:
                              "Full substituted text line for this speaker with furigana e.g., いつも カメラを 持[も]って いるんですか。",
                          },
                        },
                        required: ["speaker", "text"],
                      },
                    },
                  },
                  required: [
                    "var_number",
                    "prompt_text",
                    "target_conjugation",
                    "full_lines",
                  ],
                },
              },
            },
            required: ["exercise_number", "dialogue_template", "variations"],
          },
        },
      },
    });

    const prompt = `
Extract all Minna no Nihongo Renshuu C (練習C) exercises across these ${files.length} image(s) for Lesson ${lessonNumber}.

CRITICAL INSTRUCTIONS FOR DIALOGUE RECONSTRUCTION & GRAMMAR CONJUGATION:
1. EXERCISE COUNT & VARIATIONS: Extract all 3 main exercises (Exercise 1, 2, and 3). For each exercise, extract all 3 variations: 'れい' (Example), '1' (Variation 1), and '2' (Variation 2) — generating a total of 9 variation datasets.

2. GRAMMAR CONJUGATION FOR VARIATIONS 1 & 2:
   - When generating 'full_lines' for Variation 1 ('1') and Variation 2 ('2'), do NOT just insert raw dictionary/prompt words. 
   - FULLY CONJUGATE the replacement verbs/adjectives into the target grammar pattern taught in the exercise (e.g., converting dictionary forms like "聞きます" -> "聞いたら" / "撮れます" -> "撮れるように"), exactly as shown in the 'れい' example.
   - The reconstructed variations must reflect how students speak them aloud in language class drills.

3. BASE TEMPLATE UNDERLINING: In 'dialogue_template.lines', wrap the underlined target parts with HTML <u> tags (e.g., "いつも <u>電子辞書[でんしじしょ]</u>を 持[も]って いるんですか。").

4. FULL DIALOGUE LINES FOR ALL SPEAKERS: For every variation ('れい', '1', '2'), reconstruct the complete conversation under 'full_lines'. If prompt cue ① replaces a word in Speaker A's sentence (e.g. changing "電子辞書" to "カメラ" or "パソコン"), ensure Speaker A's line is properly updated as well.

5. FURIGANA FORMATTING: For ALL Kanji in all text fields ('text', 'prompt_text', 'target_conjugation'), append Hiragana readings in square brackets immediately following the Kanji (e.g., "持[も]って", "撮[と]れるように").

Return ONLY valid JSON matching the required schema.
`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const extractedExercises = JSON.parse(result.response.text());

    const formattedRows = extractedExercises.map((ex: any) => ({
      level: level,
      lesson_number: Number(lessonNumber),
      exercise_number: Number(ex.exercise_number),
      section_type: "RENSHUU_C",
      grammar_point: ex.grammar_point || null,
      dialogue_template: ex.dialogue_template,
      variations: ex.variations,
    }));

    const { data: dbData, error: dbError } = await supabase
      .from("jlpt_kaiwa")
      .upsert(formattedRows, { onConflict: "lesson_number,exercise_number" })
      .select();

    if (dbError) {
      console.error("Supabase Upsert Error:", dbError);
      return NextResponse.json(
        {
          error: "Failed to store extracted kaiwa in database.",
          details: dbError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lesson_number: Number(lessonNumber),
      count: dbData ? dbData.length : 0,
      data: dbData,
    });
  } catch (error: any) {
    console.error("Multi-Page Kaiwa OCR Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process image with Gemini AI." },
      { status: 500 },
    );
  }
}
