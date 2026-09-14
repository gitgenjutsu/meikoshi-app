"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface VocabDbItem {
  id?: string;
  word?: string;
  reading?: string;
  meanings?: string;
  meaning?: string;
  example_ja?: string;
  example_en?: string;
  example_sentence?: string;
  example_translation?: string;
  exampleJa?: string;
  exampleEn?: string;
}

export interface VocabQuestion {
  id: string;
  promptMeaning: string;
  targetAnswer: string;
  exampleJa: string;
  exampleEn: string;
}

interface VocabTypingDrillProps {
  currentLessonVocab: VocabDbItem[];
  onClose: () => void;
}

export default function VocabTypingDrill({
  currentLessonVocab = [],
  onClose,
}: VocabTypingDrillProps) {
  const [questions, setQuestions] = useState<VocabQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInputText, setUserInputText] = useState("");
  const [isEvaluating] = useState(false);

  // Synchronous refs for state tracking without re-triggering timer effects
  const userInputRef = useRef("");
  userInputRef.current = userInputText;

  const isSubmittingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [timeLeft, setTimeLeft] = useState(15);
  const [history, setHistory] = useState<
    Array<{
      question: VocabQuestion;
      userAnswerText: string;
      isCorrect: boolean;
    }>
  >([]);
  const [isFinished, setIsFinished] = useState(false);

  const textInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Build max 20 random questions (Hides Japanese answer from question prompt)
  useEffect(() => {
    if (!currentLessonVocab || currentLessonVocab.length === 0) return;

    const shuffle = <T,>(arr: T[]): T[] =>
      [...arr].sort(() => Math.random() - 0.5);

    const uniqueVocab = Array.from(
      new Map(
        currentLessonVocab.map((item) => [
          item.reading || item.word || String(Math.random()),
          item,
        ]),
      ).values(),
    );

    const selectedVocab = shuffle(uniqueVocab).slice(0, 20);

    const generatedQuestions: VocabQuestion[] = selectedVocab.map(
      (item, idx) => ({
        id: `vocab-${idx}-${item.id || crypto.randomUUID()}`,
        promptMeaning: item.meanings || item.meaning || "Translate to Kana",
        targetAnswer: item.reading || item.word || "",
        // Fallbacks across all common Supabase database column names
        exampleJa:
          item.example_ja || item.example_sentence || item.exampleJa || "",
        exampleEn:
          item.example_en || item.example_translation || item.exampleEn || "",
      }),
    );

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setHistory([]);
    setIsFinished(false);
  }, [currentLessonVocab]);

  // Focus text input on question load
  useEffect(() => {
    if (textInputRef.current && !isFinished) {
      textInputRef.current.focus();
    }
  }, [currentIndex, isFinished, questions]);

  // Stable submission callback without nested state setters
  const handleSubmitAnswer = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      // Lock submit actions if already processing or drill complete
      if (isSubmittingRef.current || isFinished) return;
      isSubmittingRef.current = true;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const currentQ = questions[currentIndex];
      if (!currentQ) {
        isSubmittingRef.current = false;
        return;
      }

      const textAns = userInputRef.current.trim();
      const cleanTarget = currentQ.targetAnswer.trim().toLowerCase();
      const isCorrect = textAns.toLowerCase() === cleanTarget;

      // Append score result for current item
      setHistory((prev) => [
        ...prev,
        {
          question: currentQ,
          userAnswerText: textAns,
          isCorrect,
        },
      ]);

      setUserInputText("");
      userInputRef.current = "";

      // Move to next question or complete drill
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        isSubmittingRef.current = false;
      } else {
        setIsFinished(true);
      }
    },
    [currentIndex, questions, isFinished],
  );

  // 3. Timer Control
  useEffect(() => {
    if (isFinished || questions.length === 0) return;

    setTimeLeft(15);
    isSubmittingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleSubmitAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, isFinished, questions.length, handleSubmitAnswer]);

  // Score Review Card View
  if (isFinished) {
    // Safety fallback: limit history to maximum question batch size
    const finalHistory = history.slice(0, questions.length || 20);
    const score = finalHistory.filter((h) => h.isCorrect).length;

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            語彙テスト 結果 (Vocab Test Results)
          </h2>
          <p className="text-4xl font-black text-indigo-600 mt-2">
            {score} / {finalHistory.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accuracy:{" "}
            {finalHistory.length > 0
              ? Math.round((score / finalHistory.length) * 100)
              : 0}
            %
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {finalHistory.map((item, idx) => (
            <div
              key={`${item.question.id}-${idx}`}
              className={`p-4 rounded-xl border space-y-3 transition-colors duration-200 ${
                item.isCorrect
                  ? "bg-green-50/40 border-green-200"
                  : "bg-red-50/40 border-red-200"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-gray-400">
                    Q{idx + 1}
                  </span>
                  <div className="text-lg font-bold text-gray-900 leading-tight">
                    {item.question.promptMeaning}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs font-medium text-gray-500">
                    Your Answer:{" "}
                    <span
                      className={`font-bold text-sm ${
                        item.isCorrect
                          ? "text-green-900"
                          : "text-red-600 line-through"
                      }`}
                    >
                      {item.userAnswerText || "(empty)"}
                    </span>
                  </div>
                  {!item.isCorrect && (
                    <div className="text-xs font-bold text-green-700">
                      Correct:{" "}
                      <span className="text-sm">
                        {item.question.targetAnswer}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Example Sentence Review Display */}
              {item.question.exampleJa ? (
                <div className="pt-2 border-t border-gray-200/60 text-xs space-y-1">
                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                    <span>💬</span> Example:
                  </div>
                  <div
                    className="text-sm text-gray-800 leading-relaxed pl-3 border-l-2 border-indigo-400"
                    dangerouslySetInnerHTML={{
                      __html: item.question.exampleJa,
                    }}
                  />
                  {item.question.exampleEn && (
                    <div className="text-gray-500 italic text-[11px] pl-3">
                      "{item.question.exampleEn}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-1 text-[11px] text-gray-400 italic">
                  No example sentence available for this word.
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition"
        >
          Finish Drill
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  if (questions.length === 0 || !currentQ) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow border">
        Loading vocabulary questions...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full">
          Vocab Kana Typing Drill
        </span>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2 py-1 rounded-md ${
              timeLeft <= 3
                ? "bg-red-100 text-red-600 animate-pulse"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            ⏱️ {timeLeft}s
          </span>
          <span className="text-sm text-gray-500 font-medium">
            Q{currentIndex + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Target Word Display - Only English Meaning */}
      <div className="text-center py-8 space-y-2 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">
          Translate to Kana
        </div>
        <div className="text-3xl font-black text-gray-900 tracking-wide px-4">
          {currentQ.promptMeaning}
        </div>
      </div>

      <form onSubmit={handleSubmitAnswer} className="space-y-4">
        <input
          ref={textInputRef}
          type="text"
          value={userInputText}
          onChange={(e) => setUserInputText(e.target.value)}
          placeholder="Type in Kana (e.g. こわします)..."
          className="w-full text-center text-2xl py-3 border-2 border-indigo-500 text-gray-900 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 font-semibold"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isEvaluating}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isEvaluating ? "Checking..." : "Submit Answer ↵"}
        </button>
      </form>
    </div>
  );
}
