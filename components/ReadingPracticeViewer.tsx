"use client";

import React, { useState, useEffect } from "react";

export interface VocabularyItem {
  word: string;
  reading: string;
  meaning: string;
}

export interface ReadingQuestion {
  id: string;
  question: string;
  prompt_en: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export interface ReadingPassage {
  id?: string;
  level: string;
  title_en: string;
  title_ja?: string;
  passage_type: "notice" | "chat" | "email" | "article" | string;
  content_ja: string;
  content_en?: string;
  vocabulary_breakdown: VocabularyItem[];
  questions: ReadingQuestion[];
}

interface ReadingPracticeViewerProps {
  selectedLevel: string; // Passed from PracticePage
  onClose: () => void;
}

function renderFuriganaText(text?: string, showFurigana: boolean = true) {
  if (!text) return null;
  if (!showFurigana) return text.replace(/\[.*?\]/g, "");

  const regex = /([\u4e00-\u9faf\u3400-\u4dbf]+)\[(.*?)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const kanji = match[1];
    const reading = match[2];
    parts.push(
      <ruby key={match.index} className="inline-flex flex-col items-center">
        {kanji}
        <rt className="text-[10px] text-blue-600 font-normal leading-none select-none">
          {reading}
        </rt>
      </ruby>,
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts}</>;
}

export default function ReadingPracticeViewer({
  selectedLevel,
  onClose,
}: ReadingPracticeViewerProps) {
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFurigana, setShowFurigana] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: number }>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const fetchPassage = async (forceNew: boolean = false) => {
    setLoading(true);
    setSubmitted(false);
    setUserAnswers({});
    try {
      const res = await fetch("/api/generate-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: selectedLevel, forceNew }),
      });
      const payload = await res.json();
      if (payload.data) {
        setPassage(payload.data);
      }
    } catch (err) {
      console.error("Failed to load reading passage:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch passage matching user's selected level on mount
  useEffect(() => {
    fetchPassage(false);
  }, [selectedLevel]);

  const handleSelectOption = (qId: string, optIdx: number) => {
    if (submitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-extrabold rounded-full">
              Level {selectedLevel}
            </span>
            <h2 className="text-xl font-bold text-gray-900">
              Reading Comprehension
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-world Japanese notices, chats & situational passages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            👁️ {showFurigana ? "Furigana On" : "Furigana Off"}
          </button>
          <button
            onClick={() => fetchPassage(true)}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            🔄 New Passage
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-600">
            Fetching {selectedLevel} reading passage...
          </p>
        </div>
      ) : passage ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MAIN CONTENT (PASSAGE & QUIZ) */}
          <div className="lg:col-span-2 space-y-6">
            {/* PASSAGE CARD */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    {passage.passage_type}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    {passage.title_ja
                      ? renderFuriganaText(passage.title_ja, showFurigana)
                      : passage.title_en}
                  </h3>
                  <p className="text-xs text-gray-500">{passage.title_en}</p>
                </div>

                {passage.content_en && (
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {showTranslation ? "Hide English" : "Show English"}
                  </button>
                )}
              </div>

              {/* JAPANESE TEXT */}
              <div className="bg-slate-50 p-5 rounded-xl text-gray-900 leading-relaxed text-base border border-slate-200 whitespace-pre-line">
                {renderFuriganaText(passage.content_ja, showFurigana)}
              </div>

              {showTranslation && passage.content_en && (
                <div className="bg-amber-50/80 p-4 rounded-xl text-xs text-amber-900 border border-amber-200 whitespace-pre-line">
                  <p className="font-bold mb-1">English Translation:</p>
                  <p>{passage.content_en}</p>
                </div>
              )}
            </div>

            {/* COMPREHENSION QUESTIONS */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">
                Comprehension Questions
              </h4>

              {passage.questions.map((q, idx) => (
                <div key={q.id || idx} className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-blue-600">
                      Question {idx + 1}
                    </p>
                    <p className="font-bold text-gray-900 text-sm">
                      {q.question}
                    </p>
                    {q.prompt_en && (
                      <p className="text-xs text-gray-500">{q.prompt_en}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = userAnswers[q.id] === optIdx;
                      const isCorrect = optIdx === q.correct_option_index;

                      let btnStyle =
                        "bg-gray-50 border-gray-200 text-gray-800 hover:border-blue-400";
                      if (isSelected)
                        btnStyle =
                          "bg-blue-50 border-blue-600 text-blue-900 font-bold";

                      if (submitted) {
                        if (isCorrect)
                          btnStyle =
                            "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold";
                        else if (isSelected && !isCorrect)
                          btnStyle = "bg-rose-50 border-rose-500 text-rose-900";
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          className={`p-3 rounded-xl border text-left text-xs transition ${btnStyle}`}
                        >
                          <span className="font-semibold mr-2">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700">
                      <p className="font-bold text-indigo-900 mb-0.5">
                        Explanation:
                      </p>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}

              {!submitted && (
                <button
                  onClick={() => setSubmitted(true)}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  Submit Answers
                </button>
              )}
            </div>
          </div>

          {/* SIDEBAR: VOCABULARY BREAKDOWN */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3 sticky top-6">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                📖 Passage Vocabulary
              </h4>

              <div className="divide-y divide-gray-100">
                {passage.vocabulary_breakdown?.map((item, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-gray-900 text-sm">
                        {item.word}
                      </span>
                      <span className="text-[11px] text-blue-600 font-medium">
                        {item.reading}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
