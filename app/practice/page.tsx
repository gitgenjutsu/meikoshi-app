"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import QuizEngine, { Question } from "@/components/jlpt/QuizEngine";
import ScoreReviewModal from "@/components/jlpt/ScoreReviewModal";

type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";
type PracticeMode = "VOCABULARY" | "KANJI" | "GRAMMAR" | "FULL_EXAM";

interface TestSet {
  id: string;
  title: string;
  year: number;
  month: number;
}

interface VocabularyRow {
  id: string;
  level: string;
  word: string;
  reading: string | null;
  meanings: string;
  example_ja: string | null;
  example_en: string | null;
}

interface GrammarRow {
  id: string;
  level: string;
  pattern?: string;
  grammar_point?: string; // Fallback field name
  pattern_ja?: string; // Fallback field name
  meaning?: string;
  meanings?: string; // Fallback field name
  meaning_en?: string; // Fallback field name
  example_ja?: string | null;
  example_en?: string | null;
}

interface KanjiRow {
  id: string;
  level: string;
  kanji?: string;
  character?: string; // Fallback field name
  onyomi?: string | null;
  kunyomi?: string | null;
  meaning?: string;
  meanings?: string; // Fallback field name
  meaning_en?: string; // Fallback field name
  examples?: string | null;
}

export default function PracticePage() {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (selectedLevel && selectedMode === "FULL_EXAM") {
      fetchTestSets(selectedLevel);
    }
  }, [selectedLevel, selectedMode]);

  // 10-Second Auto-Advance Countdown Logic
  useEffect(() => {
    if (!selectedMode || questions.length === 0 || quizFinished) return;

    setTimeLeft(10); // 10 seconds per question

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoNext();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, questions, quizFinished, selectedMode]);

  const handleAutoNext = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIndex,
    }));

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishQuiz();
    }
  };

  // Explicit End Test Action
  const handleEndQuizEarly = () => {
    finishQuiz();
  };

  const finishQuiz = async () => {
    setQuizFinished(true);

    const answeredIndices = Object.keys(userAnswers);
    let calculatedScore = 0;

    answeredIndices.forEach((key) => {
      const idx = Number(key);
      if (userAnswers[idx] === questions[idx]?.correct_option_index) {
        calculatedScore++;
      }
    });

    setFinalScore(calculatedScore);

    if (selectedLevel) {
      const totalAttempted = answeredIndices.length || 1;
      const percentage = (calculatedScore / totalAttempted) * 100;

      await supabase.from("jlpt_attempts").insert([
        {
          level: selectedLevel,
          total_score: calculatedScore,
          is_passed: percentage >= 60,
          answers_json: userAnswers,
        },
      ]);
    }
  };

  const fetchTestSets = async (level: JLPTLevel) => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("jlpt_test_sets")
      .select("id, title, year, month")
      .eq("level", level)
      .order("year", { ascending: false });

    if (error) {
      console.error("Error fetching test sets:", error);
      setErrorMessage("Failed to load practice test sets from database.");
    } else if (data) {
      setTestSets(data);
    }
    setLoading(false);
  };

  // --- TRANSFORMERS ---

  const transformVocabToQuestions = (
    vocabList: VocabularyRow[],
  ): Question[] => {
    return vocabList.map((item, idx) => {
      const otherMeanings = vocabList
        .filter((_, i) => i !== idx)
        .map((v) => v.meanings);

      const shuffledDistractors = [...otherMeanings]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push("Incorrect Option");
      }

      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...shuffledDistractors];
      options.splice(correctIndex, 0, item.meanings);

      const exampleText = item.example_ja
        ? `Example: ${item.example_ja}${item.example_en ? ` (${item.example_en})` : ""}`
        : "";

      return {
        id: item.id || String(idx),
        level: (selectedLevel || item.level || "N4") as JLPTLevel,
        section: "VOCABULARY",
        question_type: "MULTIPLE_CHOICE",
        prompt_text: `Select the correct English meaning for "${item.word}".`,
        question: item.word,
        reading: item.reading,
        options,
        correct_option_index: correctIndex,
        explanation: exampleText,
      };
    });
  };

  const transformGrammarToQuestions = (
    grammarList: GrammarRow[],
  ): Question[] => {
    return grammarList.map((item, idx) => {
      const patternText =
        item.pattern || item.grammar_point || item.pattern_ja || "文法";
      const primaryMeaning =
        item.meaning || item.meanings || item.meaning_en || "Meaning N/A";

      const otherMeanings = grammarList
        .filter((_, i) => i !== idx)
        .map((g) => g.meaning || g.meanings || g.meaning_en)
        .filter((m): m is string => Boolean(m));

      const shuffledDistractors = [...otherMeanings]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push("Incorrect Pattern Meaning");
      }

      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...shuffledDistractors];
      options.splice(correctIndex, 0, primaryMeaning);

      const exampleText = item.example_ja
        ? `Example: ${item.example_ja}${item.example_en ? ` (${item.example_en})` : ""}`
        : undefined;

      return {
        id: item.id || String(idx),
        level: (selectedLevel || item.level || "N4") as JLPTLevel,
        section: "GRAMMAR",
        question_type: "MULTIPLE_CHOICE",
        prompt_text: `Select the correct usage/meaning for "${patternText}".`,
        question: patternText,
        reading: patternText,
        options,
        correct_option_index: correctIndex,
        explanation: exampleText,
      };
    });
  };

  const transformKanjiToQuestions = (kanjiList: KanjiRow[]): Question[] => {
    return kanjiList.map((item, idx) => {
      // Determine the actual kanji character and meaning safely
      const kanjiText = item.kanji || item.character || "漢字";
      const primaryMeaning =
        item.meaning || item.meanings || item.meaning_en || "Meaning N/A";

      // Collect meanings from other rows for distractors
      const otherMeanings = kanjiList
        .filter((_, i) => i !== idx)
        .map((k) => k.meaning || k.meanings || k.meaning_en)
        .filter((m): m is string => Boolean(m));

      const shuffledDistractors = [...otherMeanings]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push("Incorrect Kanji Meaning");
      }

      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...shuffledDistractors];
      options.splice(correctIndex, 0, primaryMeaning);

      const readings = [
        item.onyomi ? `On: ${item.onyomi}` : null,
        item.kunyomi ? `Kun: ${item.kunyomi}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        id: item.id || String(idx),
        level: (selectedLevel || item.level || "N4") as JLPTLevel,
        section: "KANJI",
        question_type: "MULTIPLE_CHOICE",
        prompt_text: `Select the correct English meaning for the Kanji "${kanjiText}".`,
        question: kanjiText,
        reading: readings || null,
        options,
        correct_option_index: correctIndex,
        explanation: item.examples ? `Usage: ${item.examples}` : undefined,
      };
    });
  };

  // --- QUIZ START ROUTER ---

  const startQuiz = async (mode: PracticeMode) => {
    if (!selectedLevel) return;

    setSelectedMode(mode);
    setLoading(true);
    setErrorMessage(null);
    setQuizFinished(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});

    if (mode === "VOCABULARY") {
      const { data, error } = await supabase
        .from("jlpt_vocabulary")
        .select("*")
        .eq("level", selectedLevel);

      if (error) {
        console.error("Error fetching vocabulary:", error);
        setErrorMessage("Failed to load vocabulary deck.");
      } else if (data && data.length > 0) {
        const transformed = transformVocabToQuestions(data as VocabularyRow[]);
        setQuestions([...transformed].sort(() => Math.random() - 0.5));
      } else {
        setErrorMessage(`No vocabulary data found for ${selectedLevel}.`);
      }
    } else if (mode === "GRAMMAR") {
      const { data, error } = await supabase
        .from("jlpt_grammar")
        .select("*")
        .eq("level", selectedLevel);

      if (error) {
        console.error("Error fetching grammar:", error);
        setErrorMessage("Failed to load grammar deck.");
      } else if (data && data.length > 0) {
        const transformed = transformGrammarToQuestions(data as GrammarRow[]);
        setQuestions([...transformed].sort(() => Math.random() - 0.5));
      } else {
        setErrorMessage(`No grammar data found for ${selectedLevel}.`);
      }
    } else if (mode === "KANJI") {
      const { data, error } = await supabase
        .from("jlpt_kanji")
        .select("*")
        .eq("level", selectedLevel);

      if (error) {
        console.error("Error fetching kanji:", error);
        setErrorMessage("Failed to load kanji deck.");
      } else if (data && data.length > 0) {
        const transformed = transformKanjiToQuestions(data as KanjiRow[]);
        setQuestions([...transformed].sort(() => Math.random() - 0.5));
      } else {
        setErrorMessage(`No kanji data found for ${selectedLevel}.`);
      }
    }

    setLoading(false);
  };

  const resetAll = () => {
    setSelectedLevel(null);
    setSelectedMode(null);
    setSelectedSetId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setErrorMessage(null);
    setQuizFinished(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Meikoshi JLPT Practice Platform
        </h1>

        {/* STEP 1: SELECT LEVEL */}
        {!selectedLevel && (
          <div>
            <p className="text-center text-gray-600 mb-6">
              Select your target JLPT level to begin
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {(["N5", "N4", "N3", "N2", "N1"] as JLPTLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  disabled={level !== "N5" && level !== "N4"}
                  className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-3xl font-extrabold text-blue-600 block mb-1">
                    {level}
                  </span>
                  <span className="text-xs text-gray-500">
                    Practice Sets & Questions
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT MODE */}
        {selectedLevel && !selectedMode && !loading && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setSelectedLevel(null)}
                className="text-sm font-medium text-gray-500 hover:text-gray-800 underline"
              >
                &larr; Choose Different Level
              </button>
              <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                Level {selectedLevel}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Choose Practice Mode
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => startQuiz("VOCABULARY")}
                className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
              >
                <div className="text-xl mb-1">📝</div>
                <h3 className="font-bold text-gray-900">Vocabulary</h3>
                <p className="text-xs text-gray-500 mt-1">
                  10s timed per question full deck drill
                </p>
              </button>

              <button
                onClick={() => startQuiz("KANJI")}
                className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
              >
                <div className="text-xl mb-1">漢</div>
                <h3 className="font-bold text-gray-900">Kanji</h3>
                <p className="text-xs text-gray-500 mt-1">
                  10s timed per question full deck drill
                </p>
              </button>

              <button
                onClick={() => startQuiz("GRAMMAR")}
                className="p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
              >
                <div className="text-xl mb-1">⛩️</div>
                <h3 className="font-bold text-gray-900">Grammar</h3>
                <p className="text-xs text-gray-500 mt-1">
                  10s timed per question full deck drill
                </p>
              </button>
            </div>
          </div>
        )}

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">
              Fetching full practice deck...
            </p>
          </div>
        )}

        {errorMessage && !loading && (
          <div className="max-w-md mx-auto text-center p-6 bg-red-50 border border-red-200 rounded-xl mb-6">
            <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
            <button
              onClick={resetAll}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
            >
              Back to Selection
            </button>
          </div>
        )}

        {/* STEP 3: ACTIVE QUIZ ENGINE */}
        {selectedLevel && questions.length > 0 && !quizFinished && (
          <div className="max-w-2xl mx-auto">
            {/* Header with Save & Exit Action and Timer */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleEndQuizEarly}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <span>🛑</span> End & Save Results
              </button>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                  ⏱️ {timeLeft}s Left
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 3 ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              ></div>
            </div>

            {/* Render Current Question with unique key to reset component selection state */}
            <QuizEngine
              key={currentQuestionIndex}
              questions={[questions[currentQuestionIndex]]}
              onComplete={(score, total, answers) => {
                const selectedIdx = answers[0];
                handleAnswerSelect(selectedIdx);
              }}
            />
          </div>
        )}

        {/* SCORE MODAL - DISPLAY RESULTS ON FINISH OR EARLY EXIT */}
        {quizFinished && (
          <ScoreReviewModal
            questions={questions.slice(
              0,
              Math.max(
                Object.keys(userAnswers).length,
                currentQuestionIndex + 1,
              ),
            )}
            selectedAnswers={userAnswers}
            score={finalScore}
            onRestart={resetAll}
          />
        )}
      </div>
    </main>
  );
}
