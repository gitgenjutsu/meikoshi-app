"use client";

import React from "react";
import { Question } from "./QuizEngine";

// Extended interface to safely cover all potential field variations
interface ExtendedQuestion extends Question {
  explanation_en?: string;
  meanings?: string;
  meaning?: string;
}

interface ScoreReviewModalProps {
  questions: Question[];
  selectedAnswers: { [key: number]: number };
  score: number;
  onRestart: () => void;
}

export default function ScoreReviewModal({
  questions,
  selectedAnswers,
  score,
  onRestart,
}: ScoreReviewModalProps) {
  const total = questions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isPassed = percentage >= 60;

  // Calculate scores per section
  const sectionStats = questions.reduce(
    (acc, q, idx) => {
      const sec = q.section || "GENERAL";
      if (!acc[sec]) acc[sec] = { correct: 0, total: 0 };
      acc[sec].total += 1;
      if (selectedAnswers[idx] === q.correct_option_index) {
        acc[sec].correct += 1;
      }
      return acc;
    },
    {} as { [key: string]: { correct: number; total: number } },
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8 text-gray-900">
        {/* Pass / Fail Banner */}
        <div
          className={`text-center p-6 rounded-xl mb-6 ${
            isPassed
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <span
            className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 ${
              isPassed
                ? "bg-green-200 text-green-900"
                : "bg-red-200 text-red-900"
            }`}
          >
            {isPassed ? "合格 (Passed)" : "不合格 (Needs Practice)"}
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {score} / {total}{" "}
            <span className="text-lg font-normal text-gray-600">
              ({percentage}%)
            </span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isPassed
              ? "Great job! You met the passing benchmark for this practice set."
              : "Keep reviewing vocabulary and grammar patterns to improve your score."}
          </p>
        </div>

        {/* Section Breakdown */}
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          Section Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {Object.entries(sectionStats).map(([secName, stat]) => (
            <div
              key={secName}
              className="p-4 bg-gray-50 border border-gray-200 rounded-xl"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {secName}
              </span>
              <p className="text-xl font-bold text-gray-900">
                {stat.correct} / {stat.total}
              </p>
            </div>
          ))}
        </div>

        {/* Question-by-Question Review */}
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Detailed Answers & Explanations
        </h3>
        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 mb-8">
          {questions.map((q: ExtendedQuestion, idx) => {
            const studentAns = selectedAnswers[idx];
            const isCorrect = studentAns === q.correct_option_index;

            // Resolve correct answer text and explanation dynamically
            const correctAnswerText = q?.options[q?.correct_option_index];
            const explanationText =
              q?.explanation ||
              q?.explanation_en ||
              (q.meanings && q.meanings !== correctAnswerText
                ? q.meanings
                : null);

            return (
              <div
                key={q.id || idx}
                className={`p-4 rounded-xl border ${
                  isCorrect
                    ? "border-green-200 bg-green-50/30"
                    : "border-red-200 bg-red-50/30"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-gray-500">
                    Q{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isCorrect
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>

                <p className="font-semibold text-gray-900 mb-2">
                  {q.prompt_text.replace(/\*\*/g, "")}
                </p>

                <div className="text-sm space-y-1 mb-2">
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-500">
                      Your Answer:
                    </span>{" "}
                    <span
                      className={
                        isCorrect
                          ? "text-green-700 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {studentAns !== undefined
                        ? q.options[studentAns]
                        : "Not Answered"}
                    </span>
                  </p>

                  <p className="text-gray-700">
                    <span className="font-medium text-gray-500">
                      Correct Meaning / Answer:
                    </span>{" "}
                    <span className="text-green-700 font-semibold">
                      {correctAnswerText}
                    </span>
                  </p>
                </div>

                {/* READING / FURIGANA */}
                {q.reading && (
                  <div className="mt-1 mb-2">
                    <p className="text-sm font-bold text-blue-600">
                      Reading: {q.reading}
                    </p>
                  </div>
                )}

                {/* EXPLANATION / USAGE EXAMPLES */}
                {explanationText && (
                  <div className="mt-2 text-xs bg-white p-3 rounded-lg border border-gray-200 text-gray-700">
                    <span className="font-bold text-blue-600">
                      Explanation:
                    </span>{" "}
                    {explanationText}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={onRestart}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md"
        >
          Back to Level Selection
        </button>
      </div>
    </div>
  );
}
