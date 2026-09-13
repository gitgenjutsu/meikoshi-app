"use client";

import React, { useState, useEffect } from "react";

export interface FormOption {
  text: string;
  ruby_html?: string;
}

export interface FormQuizQuestion {
  id: string;
  level: "N5" | "N4";
  prompt_text: string; // e.g. 「（ ）に入る最もよいものを一つ選びなさい。」
  question_html: string; // "<ruby>昨日<rt>きのう</rt></ruby>、友達に（ ）。"
  target_form_ja: string; // e.g. "た形（過去形）"
  options: FormOption[];
  correct_option_index: number;
  explanation: {
    rule_ja: string;
    verb_group: string;
    example_html: string;
  };
}

interface FormDrillEngineProps {
  questions: FormQuizQuestion[];
  onComplete?: () => void;
  onClose?: () => void;
}

export default function FormDrillEngine({
  questions,
  onComplete,
  onClose,
}: FormDrillEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [history, setHistory] = useState<
    Array<{
      question: FormQuizQuestion;
      selectedIndex: number | null;
      isCorrect: boolean;
    }>
  >([]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  // 10-second timer per question
  useEffect(() => {
    if (isFinished || !currentQ) return;

    setTimeLeft(10);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleNextQuestion(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isFinished]);

  const handleNextQuestion = (chosenIdx: number | null) => {
    if (!currentQ) return;

    const isCorrect = chosenIdx === currentQ.correct_option_index;
    const updatedHistory = [
      ...history,
      { question: currentQ, selectedIndex: chosenIdx, isCorrect },
    ];

    setHistory(updatedHistory);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      if (onComplete) onComplete();
    }
  };

  if (!currentQ && !isFinished) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow border">
        No conjugation questions available.
      </div>
    );
  }

  // --- SCORE CARD REVIEW VIEW ---
  if (isFinished) {
    const score = history.filter((h) => h.isCorrect).length;
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-lg border">
        <div className="text-center pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            活用ドリル 結果 (Result)
          </h2>
          <p className="text-4xl font-black text-purple-600 mt-2">
            {score} / {history.length}
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {history.map((item, idx) => {
            const { question, selectedIndex, isCorrect } = item;
            const userChoice =
              selectedIndex !== null ? question.options[selectedIndex] : null;
            const correctChoice =
              question.options[question.correct_option_index];

            return (
              <div
                key={question.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  isCorrect
                    ? "bg-green-50/50 border-green-200"
                    : "bg-red-50/50 border-red-200"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    Q{idx + 1}. {question.target_form_ja}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isCorrect
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {isCorrect ? "正解" : "不正解"}
                  </span>
                </div>

                <div
                  className="text-base font-bold text-gray-900 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: question.question_html }}
                />

                <div className="text-xs space-y-1 pt-1">
                  {!isCorrect && (
                    <div className="text-red-700">
                      ❌ <b>Your Answer:</b>{" "}
                      <span
                        dangerouslySetInnerHTML={{
                          __html:
                            userChoice?.ruby_html ||
                            userChoice?.text ||
                            "Time expired",
                        }}
                      />
                    </div>
                  )}
                  <div className="text-green-800 font-semibold">
                    ✅ <b>Correct Answer:</b>{" "}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: correctChoice.ruby_html || correctChoice.text,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-lg border text-xs text-gray-700 space-y-1 mt-2">
                  <div className="font-bold text-purple-900">
                    💡 Explanation ({question.explanation.verb_group}):
                  </div>
                  <p>{question.explanation.rule_ja}</p>
                  <div
                    className="pt-1.5 border-t border-gray-100 text-gray-800"
                    dangerouslySetInnerHTML={{
                      __html: question.explanation.example_html,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition"
          >
            Back to Practice
          </button>
        )}
      </div>
    );
  }

  // --- DRILL INTERFACE VIEW ---
  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Timer Bar */}
      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-purple-600 h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 10) * 100}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
        <span>【{currentQ.target_form_ja}】</span>
        <span>
          Q{currentIndex + 1} / {questions.length} (⏱️ {timeLeft}s)
        </span>
      </div>

      {/* Japanese Prompt */}
      <div className="text-sm font-bold text-gray-500">
        {currentQ.prompt_text}
      </div>

      {/* Main Sentence with Furigana */}
      <div
        className="text-2xl font-black text-gray-900 text-center py-6 bg-gray-50 rounded-xl border leading-loose"
        dangerouslySetInnerHTML={{ __html: currentQ.question_html }}
      />

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 gap-3">
        {currentQ.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleNextQuestion(idx)}
            className="w-full py-3.5 px-4 text-left border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition font-bold text-lg flex items-center gap-3 text-gray-800"
          >
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {idx + 1}
            </span>
            <span
              dangerouslySetInnerHTML={{
                __html: opt.ruby_html || opt.text,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
