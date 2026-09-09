"use client";

import React, { useState, useEffect, useRef } from "react";

export interface Question {
  id: string;
  level: string;
  section: string;
  question_type: string;
  prompt_text: string;
  options: string[];
  correct_option_index: number;
  explanation_en?: string;
  explanation?: string;
  meanings?: string;
  audio_url?: string;
  reading?: string | null;
}

interface QuizEngineProps {
  questions: Question[];
  initialSelectedOption?: number;
  onSelectOption?: (optionIndex: number) => void;
  onComplete: (
    score: number,
    total: number,
    selectedAnswers: { [key: number]: number },
  ) => void;
}

export default function QuizEngine({
  questions,
  initialSelectedOption,
  onSelectOption,
  onComplete,
}: QuizEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initialize state with initialSelectedOption if passed from parent
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: number]: number;
  }>(initialSelectedOption !== undefined ? { 0: initialSelectedOption } : {});

  const selectedAnswersRef = useRef(selectedAnswers);

  useEffect(() => {
    selectedAnswersRef.current = selectedAnswers;
  }, [selectedAnswers]);

  // Sync state if initialSelectedOption changes from parent props
  useEffect(() => {
    if (initialSelectedOption !== undefined) {
      setSelectedAnswers({ 0: initialSelectedOption });
    }
  }, [initialSelectedOption]);

  const renderFormattedPrompt = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={index}
            className="font-bold text-blue-600 underline underline-offset-4"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    // 1. Update internal state
    setSelectedAnswers((prev) => {
      const updated = { ...prev, [currentIndex]: optionIndex };
      selectedAnswersRef.current = updated;
      return updated;
    });

    // 2. Report selection immediately back to parent PracticePage state
    if (onSelectOption) {
      onSelectOption(optionIndex);
    }
  };

  const handleSubmit = () => {
    let score = 0;
    const currentAnswers = selectedAnswersRef.current;

    questions.forEach((q, idx) => {
      if (currentAnswers[idx] === q.correct_option_index) {
        score += 1;
      }
    });

    onComplete(score, questions.length, currentAnswers);
  };

  if (!currentQ) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm max-w-2xl mx-auto text-gray-900">
      {/* Audio Player */}
      {currentQ?.audio_url && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">
            聴解 Audio
          </p>
          <audio
            controls
            controlsList="nodownload"
            src={currentQ?.audio_url}
            className="w-full"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Prompt Text */}
      <h2 className="text-xl sm:text-2xl font-medium text-gray-900 mb-8 leading-relaxed">
        {renderFormattedPrompt(currentQ?.prompt_text)}
      </h2>

      {/* Options List */}
      <div className="space-y-3 mb-8">
        {currentQ?.options?.map((option, idx) => {
          const isSelected = selectedAnswers[currentIndex] === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-start ${
                isSelected
                  ? "border-blue-600 bg-blue-50/50 text-blue-950 font-semibold shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-900"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold mr-3 ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {idx + 1}
              </span>
              <span className="text-lg text-gray-900 font-medium">
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition"
        >
          {currentIndex === questions.length - 1 ? "Submit Question" : "Next"}
        </button>
      </div>
    </div>
  );
}
