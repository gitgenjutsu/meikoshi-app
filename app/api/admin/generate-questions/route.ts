import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Helper to shuffle choices
function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

// Helper to clean grammar pattern for sentence replacement (removes tilde '～' and category tags like 'N + ')
function cleanGrammarPattern(pattern: string): string {
  return pattern
    .replace(/^～|～$/g, "")
    .replace(/^(N|V|Adj|Na-adj)\s*\+\s*/g, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { level = "N5" } = await req.json().catch(() => ({}));

    // 1. Fetch Vocabulary, Kanji, and Grammar Data
    const [{ data: vocabList }, { data: kanjiList }, { data: grammarList }] =
      await Promise.all([
        supabase.from("jlpt_vocabulary").select("*").eq("level", level),
        supabase.from("jlpt_kanji").select("*").eq("level", level),
        supabase.from("jlpt_grammar").select("*").eq("level", level),
      ]);

    if (!vocabList || vocabList.length === 0) {
      return NextResponse.json(
        { error: "No vocabulary entries found for this level." },
        { status: 400 },
      );
    }

    const generatedQuestions: any[] = [];

    // ----------------------------------------------------
    // 2. GENERATE GRAMMAR QUESTIONS
    // ----------------------------------------------------
    if (grammarList && grammarList.length > 0) {
      grammarList.forEach((item) => {
        if (!item.pattern) return;

        const rawPattern = item.pattern.trim();
        const cleanedPattern = cleanGrammarPattern(rawPattern);

        // Determine prompt sentence
        let prompt = "";
        if (item.example_ja) {
          if (item.example_ja.includes(cleanedPattern)) {
            prompt = item.example_ja.replace(cleanedPattern, " ______ ");
          } else if (item.example_ja.includes(rawPattern)) {
            prompt = item.example_ja.replace(rawPattern, " ______ ");
          } else {
            prompt = `「 ______ 」: ${item.example_ja}`;
          }
        } else {
          prompt = `次の つかいかたに あう ものを えらんでください: 「 ______ 」`;
        }

        // Pick 3 random distractors from other grammar patterns
        const distractors = grammarList
          .filter((g) => g.pattern !== item.pattern)
          .map((g) => g.pattern);

        const shuffledDistractors = shuffle(distractors).slice(0, 3);
        if (shuffledDistractors.length < 3) return;

        const options = shuffle([rawPattern, ...shuffledDistractors]);
        const correctIndex = options.indexOf(rawPattern);

        generatedQuestions.push({
          level,
          section: "GRAMMAR_READING",
          question_type: "grammar_particle",
          prompt_text: prompt,
          options,
          correct_option_index: correctIndex,
          explanation_en: `Grammar Point: 「${rawPattern}」 means "${item.meaning || ""}".`,
        });
      });
    }

    // ----------------------------------------------------
    // 3. GENERATE KANJI READINGS (Assigned to KANJI section)
    // ----------------------------------------------------
    const vocabWithReading = vocabList.filter(
      (v) => v.reading && v.word !== v.reading,
    );

    vocabWithReading.forEach((item) => {
      const distractors = vocabList
        .filter((v) => v.reading && v.reading !== item.reading)
        .map((v) => v.reading);

      const shuffledDistractors = shuffle(distractors).slice(0, 3);
      if (shuffledDistractors.length < 3) return;

      const options = shuffle([item.reading, ...shuffledDistractors]);
      const correctIndex = options.indexOf(item.reading);

      const prompt = item.example_ja
        ? item.example_ja.replace(item.word, `**${item.word}**`)
        : `**${item.word}** の よみかたは なんですが。`;

      generatedQuestions.push({
        level,
        section: "KANJI", // Fixed: set to KANJI instead of VOCABULARY
        question_type: "kanji_reading",
        prompt_text: prompt,
        options,
        correct_option_index: correctIndex,
        explanation_en: `The reading for 「${item.word}」 is 「${item.reading}」 (${item.meanings || ""}).`,
      });
    });

    // ----------------------------------------------------
    // 4. GENERATE WORD MEANING QUESTIONS (Assigned to VOCABULARY section)
    // ----------------------------------------------------
    const vocabWithMeaning = vocabList.filter((v) => v.meanings);

    vocabWithMeaning.forEach((item) => {
      const distractors = vocabList
        .filter((v) => v.meanings && v.meanings !== item.meanings)
        .map((v) => v.meanings);

      const shuffledDistractors = shuffle(distractors).slice(0, 3);
      if (shuffledDistractors.length < 3) return;

      const options = shuffle([item.meanings, ...shuffledDistractors]);
      const correctIndex = options.indexOf(item.meanings);

      generatedQuestions.push({
        level,
        section: "VOCABULARY",
        question_type: "word_meaning",
        prompt_text: `「**${item.word}**」 の いみは なんですが。`,
        options,
        correct_option_index: correctIndex,
        explanation_en: `「${item.word}」 (${item.reading || ""}) means "${item.meanings}".`,
      });
    });

    // ----------------------------------------------------
    // 5. BATCH INSERT INTO SUPABASE
    // ----------------------------------------------------
    const { error: insertError } = await supabase
      .from("jlpt_questions")
      .insert(generatedQuestions);

    if (insertError) throw insertError;

    return NextResponse.json({
      message: `Successfully generated ${generatedQuestions.length} practice questions!`,
      total_generated: generatedQuestions.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
