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

const renderFurigana = (text: string) => {
  if (!text) return "";
  const parts = text.split(/([一-龯ヶ々]+\[[ぁ-んァ-ヶ]+\])/g);

  return parts.map((part, idx) => {
    const match = part.match(/([一-龯ヶ々]+)\[([ぁ-んァ-ヶ]+)\]/);
    if (match) {
      return (
        <ruby key={idx} className="px-0.5">
          {match[1]}
          <rt className="text-[0.65em] text-gray-500 font-normal">
            {match[2]}
          </rt>
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
    // 50% chance to swap option_a and option_b positions for variety
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

  // Initialize randomized set on mount or when new questions prop arrives
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setDisplayQuestions(prepareRandomizedQuestions(initialQuestions));
    }
  }, [initialQuestions]);

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
    // Reshuffle questions and choices, reset selection state
    setDisplayQuestions(prepareRandomizedQuestions(initialQuestions));
    setSelectedAnswers({});
    setIsSubmitted(false);
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* HEADER & SCORE SUMMARY */}
      <div className="flex justify-between items-center border-b pb-4">
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

          return (
            <div
              key={q.id}
              className={`p-4 border rounded-lg bg-white shadow-sm transition-all ${
                isSubmitted
                  ? isCorrect
                    ? "border-green-300 bg-green-50/20"
                    : "border-red-300 bg-red-50/20"
                  : "border-gray-200"
              }`}
            >
              {/* Question Text */}
              <div className="font-medium text-lg text-gray-900 mb-3 leading-relaxed">
                <span className="font-bold mr-2">{idx + 1}.</span>
                {renderFurigana(q.sentence_pre)}
                <span className="inline-block px-2 py-0.5 bg-gray-100 rounded border mx-1 font-mono text-blue-600 text-sm">
                  {isSubmitted
                    ? `{ a) ${q.option_a}  b) ${q.option_b} }`
                    : "[ ? ]"}
                </span>
                {renderFurigana(q.sentence_post)}
              </div>

              {/* Options Selection (A or B) */}
              <div className="grid grid-cols-2 gap-3">
                {(["a", "b"] as const).map((opt) => {
                  const label = opt === "a" ? q.option_a : q.option_b;
                  const isSelected = userAnswer === opt;

                  let btnStyle =
                    "border-gray-200 bg-gray-50 text-gray-800 hover:border-gray-300";

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
                      "border-blue-600 bg-blue-50 text-blue-800 font-semibold ring-2 ring-blue-500/20";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelect(q.id, opt)}
                      disabled={isSubmitted}
                      className={`p-3 text-left border-2 rounded-md transition-all text-sm ${btnStyle}`}
                    >
                      <span className="uppercase font-bold mr-2">{opt})</span>
                      {renderFurigana(label)}
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
                    <div className="p-2.5 bg-slate-50 border-l-4 border-blue-500 rounded text-slate-700 text-xs font-mono">
                      <span className="font-bold text-blue-900 block mb-0.5">
                        Key Example:
                      </span>
                      {renderFurigana(q.example_sentence)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SINGLE SUBMIT / RETAKE ACTION BAR */}
      <div className="sticky bottom-4 bg-white p-4 rounded-xl shadow-lg border border-gray-200 mt-8">
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
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-lg transition-colors shadow-md disabled:cursor-not-allowed"
            >
              Submit Entire Test ({answeredCount}/{totalQuestions})
            </button>
          </div>
        ) : (
          <button
            onClick={handleRetake}
            className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-colors shadow-md"
          >
            🔄 Retake Test
          </button>
        )}
      </div>
    </div>
  );
}
