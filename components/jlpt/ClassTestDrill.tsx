"use client";

import React, { useState, useEffect, useRef } from "react";

export interface VocabItem {
  id: string;
  word: string;
  reading?: string | null;
  meaning: string;
  kanji?: string | null;
}

interface ClassTestDrillProps {
  chapterTitle: string;
  items: VocabItem[];
  secondsPerQuestion?: number;
  onExit: () => void;
}

export default function ClassTestDrill({
  chapterTitle,
  items,
  secondsPerQuestion = 8,
  onExit,
}: ClassTestDrillProps) {
  const [testItems, setTestItems] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInputs, setUserInputs] = useState<{ [key: number]: string }>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Shuffle items when component mounts
  useEffect(() => {
    if (items.length > 0) {
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setTestItems(shuffled);
    }
  }, [items]);

  // Focus input automatically on prompt change
  useEffect(() => {
    if (!isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isFinished]);

  // Countdown timer per question
  useEffect(() => {
    if (isFinished || testItems.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleNextQuestion();
          return secondsPerQuestion;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isFinished, testItems, currentAnswer]);

  const handleNextQuestion = () => {
    // Save answer for current index
    setUserInputs((prev) => ({
      ...prev,
      [currentIndex]: currentAnswer.trim(),
    }));
    setCurrentAnswer("");
    setTimeLeft(secondsPerQuestion);

    if (currentIndex + 1 < testItems.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleNextQuestion();
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    testItems.forEach((item, idx) => {
      const answer = (userInputs[idx] || "").toLowerCase();
      const wordMatch = item.word.toLowerCase();
      const readingMatch = item.reading ? item.reading.toLowerCase() : "";
      const kanjiMatch = item.kanji ? item.kanji.toLowerCase() : "";

      if (
        answer &&
        (answer === wordMatch ||
          answer === readingMatch ||
          answer === kanjiMatch)
      ) {
        correctCount++;
      }
    });
    return correctCount;
  };

  if (testItems.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <p className="text-gray-600">
          No items available for this chapter test.
        </p>
        <button
          onClick={onExit}
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg"
        >
          Return
        </button>
      </div>
    );
  }

  const currentItem = testItems[currentIndex];

  // SCORE SUMMARY SCREEN
  if (isFinished) {
    const score = calculateScore();
    const percentage = Math.round((score / testItems.length) * 100);

    return (
      <div className="max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Class Test Results
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">{chapterTitle}</p>

        <div className="text-center bg-blue-50 border border-blue-100 p-6 rounded-xl mb-6">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Final Score
          </p>
          <div className="text-4xl font-extrabold text-blue-900 my-1">
            {score} / {testItems.length}
          </div>
          <p className="text-sm font-medium text-blue-700">
            {percentage}% Accuracy
          </p>
        </div>

        <h3 className="font-bold text-gray-900 mb-3">Item Breakdown</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto mb-6 pr-2">
          {testItems.map((item, idx) => {
            const answer = userInputs[idx] || "";
            const isCorrect =
              answer.toLowerCase() === item.word.toLowerCase() ||
              (item.reading &&
                answer.toLowerCase() === item.reading.toLowerCase()) ||
              (item.kanji && answer.toLowerCase() === item.kanji.toLowerCase());

            return (
              <div
                key={item.id || idx}
                className={`p-3 border rounded-xl flex justify-between items-center text-sm ${
                  isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div>
                  <span className="font-bold text-gray-900">
                    {item.meaning}
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Expected:{" "}
                    <span className="font-semibold text-gray-800">
                      {item.word}
                    </span>
                    {item.reading ? ` (${item.reading})` : ""}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-semibold ${
                      isCorrect ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {answer || "(No Answer)"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onExit}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
        >
          Exit Class Test
        </button>
      </div>
    );
  }

  // ACTIVE TEST DRILL SCREEN
  return (
    <div className="max-w-xl mx-auto p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
      {/* Header Info & Progress Bar */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
          {chapterTitle}
        </span>
        <span className="text-xs font-semibold text-gray-500">
          Word {currentIndex + 1} of {testItems.length}
        </span>
      </div>

      {/* Countdown Timer */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 3 ? "bg-red-500" : "bg-blue-600"
          }`}
          style={{ width: `${(timeLeft / secondsPerQuestion) * 100}%` }}
        ></div>
      </div>

      {/* Prompt Card */}
      <div className="text-center py-8 px-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
        <span className="text-xs text-gray-400 font-medium block mb-1">
          Write in Japanese
        </span>
        <h3 className="text-3xl font-extrabold text-gray-900">
          {currentItem.meaning}
        </h3>
      </div>

      {/* Input Field */}
      <div className="space-y-4">
        <div>
          <input
            ref={inputRef}
            type="text"
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type Kanji / Hiragana..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsFinished(true)}
            className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition"
          >
            End Test
          </button>
          <button
            onClick={handleNextQuestion}
            className="w-2/3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
          >
            {currentIndex + 1 === testItems.length
              ? "Submit & View Results"
              : "Next Word →"}
          </button>
        </div>
      </div>
    </div>
  );
}
