"use client";

import React, { useState, useEffect } from "react";

export interface BunpoQuestion {
  id: string;
  question_number: number;
  sentence_pre: string;
  sentence_post: string;
  option_a: string;
  option_b: string;
  correct_option: "a" | "b";
  grammar_rule_ref: string;
  explanation: string;
  example_sentence?: string;
}

/**
 * Render text with optional Furigana (<ruby>).
 * If showFurigana is false, it renders pure Kanji without <rt> readings.
 */
const renderFurigana = (text: string, showFurigana: boolean = true) => {
  if (!text) return "";
  const parts = text.split(/([一-龯ヶ々]+\[[ぁ-んァ-ヶ]+\])/g);

  return parts.map((part, idx) => {
    const match = part.match(/([一-龯ヶ々]+)\[([ぁ-んァ-ヶ]+)\]/);
    if (match) {
      return (
        <ruby key={idx} className="px-0.5">
          {match[1]}
          {showFurigana && (
            <rt className="text-[0.65em] text-indigo-600 font-normal animate-fadeIn">
              {match[2]}
            </rt>
          )}
        </ruby>
      );
    }
    return <span key={idx}>{part}</span>;
  });
};

/**
 * Fisher-Yates shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Randomize question order and optionally randomize option display
 */
function prepareRandomizedQuestions(
  rawQuestions: BunpoQuestion[],
): BunpoQuestion[] {
  const shuffled = shuffleArray(rawQuestions);

  return shuffled.map((q) => {
    const shouldSwap = Math.random() < 0.5;
    if (!shouldSwap) return q;

    const newCorrect: "a" | "b" = q.correct_option === "a" ? "b" : "a";
    return {
      ...q,
      option_a: q.option_b,
      option_b: q.option_a,
      correct_option: newCorrect,
    };
  });
}

export default function BunpoQuizScreen({
  questions: initialQuestions,
}: {
  questions: BunpoQuestion[];
}) {
  const [displayQuestions, setDisplayQuestions] = useState<BunpoQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, "a" | "b">
  >({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showFuriganaMap, setShowFuriganaMap] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      const prepared = prepareRandomizedQuestions(initialQuestions);
      setDisplayQuestions(prepared);

      const initialFuriganaState: Record<string, boolean> = {};
      prepared.forEach((q) => {
        initialFuriganaState[q.id] = true;
      });
      setShowFuriganaMap(initialFuriganaState);
    }
  }, [initialQuestions]);

  const toggleFurigana = (questionId: string) => {
    setShowFuriganaMap((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const totalQuestions = displayQuestions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === totalQuestions && totalQuestions > 0;

  const handleSelect = (questionId: string, option: "a" | "b") => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = () => {
    if (!isAllAnswered) return;
    setIsSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetake = () => {
    const prepared = prepareRandomizedQuestions(initialQuestions);
    setDisplayQuestions(prepared);
    setSelectedAnswers({});
    setIsSubmitted(false);

    const resetFuriganaState: Record<string, boolean> = {};
    prepared.forEach((q) => {
      resetFuriganaState[q.id] = true;
    });
    setShowFuriganaMap(resetFuriganaState);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateScore = () => {
    return displayQuestions.reduce((score, q) => {
      return selectedAnswers[q.id] === q.correct_option ? score + 1 : score;
    }, 0);
  };

  if (!displayQuestions || displayQuestions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No questions available for this lesson.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 font-sans">
      {/* HEADER & SCORE SUMMARY */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Classroom Bunpo Test
          </h1>
          <p className="text-xs text-gray-500">
            Select one option per question. Questions are randomized each
            attempt!
          </p>
        </div>

        {isSubmitted && (
          <div className="text-right">
            <span className="text-xs text-gray-500 font-semibold uppercase">
              Final Score
            </span>
            <div className="text-2xl font-black text-blue-600">
              {calculateScore()} / {totalQuestions}
            </div>
          </div>
        )}
      </div>

      {/* QUESTION LIST */}
      <div className="space-y-6">
        {displayQuestions.map((q, idx) => {
          const userAnswer = selectedAnswers[q.id];
          const isCorrect = userAnswer === q.correct_option;
          const showFurigana = showFuriganaMap[q.id] ?? true;

          return (
            <div
              key={q.id}
              className={`p-5 border rounded-2xl bg-white shadow-sm space-y-4 transition-all ${
                isSubmitted
                  ? isCorrect
                    ? "border-green-300 bg-green-50/30"
                    : "border-red-300 bg-red-50/30"
                  : "border-gray-200"
              }`}
            >
              {/* CARD HEADER: Question Number & Per-Question Eye Toggle */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Question #{idx + 1}
                </span>

                {/* EYE TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => toggleFurigana(q.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                    showFurigana
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                  title={showFurigana ? "Hide Furigana" : "Show Furigana"}
                >
                  {showFurigana ? (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span>Kana On</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.015 10.015 0 014.122-.963c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-3-3m-15 0L3 3"
                        />
                      </svg>
                      <span>Show Kana</span>
                    </>
                  )}
                </button>
              </div>

              {/* QUESTION TEXT */}
              <div className="font-medium text-lg text-gray-900 leading-relaxed">
                {renderFurigana(q.sentence_pre, showFurigana)}
                <span className="inline-block px-2.5 py-0.5 bg-gray-100 rounded border border-gray-200 mx-1 font-mono text-blue-600 text-sm font-bold">
                  {isSubmitted
                    ? `{ a) ${q.option_a}  b) ${q.option_b} }`
                    : "[ ? ]"}
                </span>
                {renderFurigana(q.sentence_post, showFurigana)}
              </div>

              {/* OPTIONS SELECTION (A or B) */}
              <div className="grid grid-cols-2 gap-3">
                {(["a", "b"] as const).map((opt) => {
                  const label = opt === "a" ? q.option_a : q.option_b;
                  const isSelected = userAnswer === opt;

                  let btnStyle =
                    "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300 hover:bg-gray-100";

                  if (isSubmitted) {
                    if (opt === q.correct_option) {
                      btnStyle =
                        "border-green-500 bg-green-100 text-green-900 font-bold";
                    } else if (isSelected && !isCorrect) {
                      btnStyle =
                        "border-red-400 bg-red-100 text-red-900 line-through opacity-80";
                    } else {
                      btnStyle =
                        "border-gray-100 bg-gray-50 text-gray-400 opacity-50";
                    }
                  } else if (isSelected) {
                    btnStyle =
                      "border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-2 ring-blue-500/20";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      disabled={isSubmitted}
                      className={`p-3 text-left border rounded-xl transition-all text-sm flex items-center gap-2 ${btnStyle}`}
                    >
                      <span className="uppercase font-bold text-gray-400">
                        {opt})
                      </span>
                      <span>{renderFurigana(label, showFurigana)}</span>
                    </button>
                  );
                })}
              </div>

              {/* END-OF-QUIZ FEEDBACK & EXAMPLES */}
              {isSubmitted && (
                <div className="mt-4 pt-3 border-t border-gray-200 text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isCorrect ? "CORRECT" : "INCORRECT"}
                    </span>
                    <span className="font-semibold text-gray-700">
                      Rule: {q.grammar_rule_ref}
                    </span>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {q.explanation}
                  </p>

                  {q.example_sentence && (
                    <div className="p-3 bg-slate-50 border-l-4 border-blue-500 rounded-lg text-slate-700 text-xs font-mono">
                      <span className="font-bold text-blue-900 block mb-0.5">
                        Key Example:
                      </span>
                      {renderFurigana(q.example_sentence, showFurigana)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ACTION BAR */}
      <div className="sticky bottom-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-200 mt-8">
        {!isSubmitted ? (
          <div className="space-y-2">
            {!isAllAnswered && (
              <p className="text-xs text-amber-600 text-center font-medium">
                Please select an answer for all questions ({answeredCount}/
                {totalQuestions} answered).
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isAllAnswered}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors shadow-md disabled:cursor-not-allowed"
            >
              Submit Entire Test ({answeredCount}/{totalQuestions})
            </button>
          </div>
        ) : (
          <button
            onClick={handleRetake}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors shadow-md"
          >
            🔄 Retake Test
          </button>
        )}
      </div>
    </div>
  );
}
