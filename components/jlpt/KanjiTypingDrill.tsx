"use client";

import React, { useState, useEffect, useRef } from "react";

export interface KanjiVocabItem {
  word: string;
  reading: string;
  meaning: string;
  example_ja: string;
  example_en: string;
}

export interface KanjiDbRow {
  id: string;
  character: string;
  lesson_number: number;
  vocabulary: KanjiVocabItem[];
}

export interface KanjiQuestion {
  id: string;
  part: 1 | 2; // 1: Kanji -> Kana (Type) | 2: Kana -> Kanji (Draw)
  promptWord: string;
  hintMeaning: string;
  targetAnswer: string;
  exampleJa: string;
  exampleEn: string;
}

interface KanjiTypingDrillProps {
  currentLessonKanji: KanjiDbRow[];
  previousLessonsKanji?: KanjiDbRow[];
  onComplete?: () => void;
  onClose?: () => void;
}

export default function KanjiTypingDrill({
  currentLessonKanji,
  previousLessonsKanji = [],
  onComplete,
  onClose,
}: KanjiTypingDrillProps) {
  const [questions, setQuestions] = useState<KanjiQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInputText, setUserInputText] = useState("");
  const [drawnImageData, setDrawnImageData] = useState<string | null>(null);
  const [isDrawingEmpty, setIsDrawingEmpty] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Lock to block double-submissions (Auto-submit + Manual click collision)
  const isSubmittingRef = useRef(false);

  // Stroke coordinate history for Google Handwriting API
  const strokesRef = useRef<number[][][]>([]);
  const currentStrokeRef = useRef<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  });

  // 15-second Countdown State
  const [timeLeft, setTimeLeft] = useState(15);

  const [history, setHistory] = useState<
    Array<{
      question: KanjiQuestion;
      userAnswerText: string;
      drawnImage: string | null;
      isCorrect: boolean;
    }>
  >([]);
  const [isFinished, setIsFinished] = useState(false);

  // Canvas refs and drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Mutable ref to handle autosubmit cleanly without stale closure
  const handleSubmitAnswerRef = useRef<() => void>(() => {});

  // Build the unique active-recall pool
  useEffect(() => {
    const allCurrentVocab: KanjiVocabItem[] = [];
    currentLessonKanji?.forEach((k) => {
      if (Array.isArray(k.vocabulary)) {
        allCurrentVocab.push(...k.vocabulary);
      }
    });

    const allPreviousVocab: KanjiVocabItem[] = [];
    previousLessonsKanji?.forEach((k) => {
      if (Array.isArray(k.vocabulary)) {
        allPreviousVocab.push(...k.vocabulary);
      }
    });

    if (allCurrentVocab.length === 0) return;

    const shuffle = <T,>(arr: T[]): T[] =>
      [...arr].sort(() => Math.random() - 0.5);

    // Filter out duplicates by unique word key
    const uniqueCurrent = Array.from(
      new Map(allCurrentVocab.map((item) => [item.word, item])).values(),
    );
    const uniquePrevious = Array.from(
      new Map(allPreviousVocab.map((item) => [item.word, item])).values(),
    );

    const shuffledCurrent = shuffle(uniqueCurrent);
    const shuffledPrevious = shuffle(uniquePrevious);

    let part1Items: KanjiVocabItem[] = [];
    if (shuffledPrevious.length > 0) {
      part1Items = [
        ...shuffledCurrent.slice(0, 8),
        ...shuffledPrevious.slice(0, 2),
      ];
    } else {
      part1Items = shuffledCurrent.slice(0, 10);
    }

    const part2Items = shuffle(uniqueCurrent).slice(0, 10);

    const generatedPart1: KanjiQuestion[] = part1Items.map((item, idx) => ({
      id: `part1-${idx}-${item.word}-${crypto.randomUUID()}`,
      part: 1,
      promptWord: item.word,
      hintMeaning: item.meaning,
      targetAnswer: item.reading,
      exampleJa: item.example_ja,
      exampleEn: item.example_en,
    }));

    const generatedPart2: KanjiQuestion[] = part2Items.map((item, idx) => ({
      id: `part2-${idx}-${item.reading}-${crypto.randomUUID()}`,
      part: 2,
      promptWord: item.reading,
      hintMeaning: item.meaning,
      targetAnswer: item.word,
      exampleJa: item.example_ja,
      exampleEn: item.example_en,
    }));

    setQuestions([...generatedPart1, ...generatedPart2]);
  }, [currentLessonKanji, previousLessonsKanji]);

  // Focus management
  useEffect(() => {
    const currentQ = questions[currentIndex];
    if (currentQ?.part === 1 && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [currentIndex, questions]);

  // Setup Canvas listeners when entering Part 2
  useEffect(() => {
    const canvas = canvasRef.current;
    const currentQ = questions[currentIndex];

    if (!canvas || currentQ?.part !== 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e1b4b";

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.round(clientX - rect.left),
        y: Math.round(clientY - rect.top),
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      currentStrokeRef.current = { x: [pos.x], y: [pos.y] };
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      currentStrokeRef.current.x.push(pos.x);
      currentStrokeRef.current.y.push(pos.y);
      setIsDrawingEmpty(false);
    };

    const stopDrawing = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      ctx.closePath();
      isDrawingRef.current = false;
      if (currentStrokeRef.current.x.length > 0) {
        strokesRef.current.push([
          currentStrokeRef.current.x,
          currentStrokeRef.current.y,
        ]);
      }
      setDrawnImageData(canvas.toDataURL("image/png"));
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);

      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
    };
  }, [currentIndex, questions]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    currentStrokeRef.current = { x: [], y: [] };
    setDrawnImageData(null);
    setIsDrawingEmpty(true);
  };

  const recognizeKanji = async (strokes: number[][][]): Promise<string[]> => {
    if (strokes.length === 0) return [];
    try {
      const res = await fetch(
        "https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=autocompleteweb",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_version: 0.4,
            api_level: "5.3",
            device: "5.3",
            input_type: 0,
            options: "enable_homophone_converter",
            requests: [
              {
                writing_guide: {
                  writing_area_width: 280,
                  writing_area_height: 280,
                },
                ink: strokes,
                language: "ja",
              },
            ],
          }),
        },
      );
      const data = await res.json();
      return data[1]?.[0]?.[1] || [];
    } catch {
      return [];
    }
  };

  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Prevent duplicate triggers per question
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const currentQ = questions[currentIndex];
    if (!currentQ) {
      isSubmittingRef.current = false;
      return;
    }

    setIsEvaluating(true);

    let isCorrect = false;
    let textAns = "";
    let drawnImg: string | null = null;

    if (currentQ.part === 1) {
      textAns = userInputText.trim();
      isCorrect =
        textAns.toLowerCase() === currentQ.targetAnswer.trim().toLowerCase();
    } else {
      const canvas = canvasRef.current;
      drawnImg =
        !isDrawingEmpty && canvas
          ? canvas.toDataURL("image/png")
          : drawnImageData;

      if (!isDrawingEmpty && strokesRef.current.length > 0) {
        const candidateMatches = await recognizeKanji(strokesRef.current);
        const targetClean = currentQ.targetAnswer.trim();
        isCorrect = candidateMatches.some(
          (candidate) =>
            candidate === targetClean || targetClean.includes(candidate),
        );
      }
    }

    setHistory((prev) => [
      ...prev,
      {
        question: currentQ,
        userAnswerText: textAns,
        drawnImage: drawnImg,
        isCorrect,
      },
    ]);

    setUserInputText("");
    setDrawnImageData(null);
    setIsDrawingEmpty(true);
    strokesRef.current = [];
    currentStrokeRef.current = { x: [], y: [] };
    setIsEvaluating(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      // Unlock for the next question index
      isSubmittingRef.current = false;
    } else {
      setIsFinished(true);
      if (onComplete) onComplete();
    }
  };

  handleSubmitAnswerRef.current = handleSubmitAnswer;

  // Countdown timer effect
  useEffect(() => {
    if (isFinished || questions.length === 0) return;

    setTimeLeft(15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmittingRef.current) {
            handleSubmitAnswerRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isFinished, questions]);

  // --- SCORE CARD VIEW ---
  if (isFinished) {
    const score = history.filter((h) => h.isCorrect).length;

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            漢字テスト 結果 (Test Results)
          </h2>
          <p className="text-4xl font-black text-purple-600 mt-2">
            {score} / {history.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accuracy: {Math.round((score / history.length) * 100)}%
          </p>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {history.map((item, idx) => (
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
                    Q{idx + 1} (
                    {item.question.part === 1 ? "Kanji → Kana" : "Kana → Kanji"}
                    )
                  </span>
                  <div className="text-2xl font-black text-gray-900 leading-tight">
                    {item.question.promptWord}
                  </div>
                  <div className="text-xs text-gray-500 italic">
                    {item.question.hintMeaning}
                  </div>
                </div>

                <div className="text-right space-y-1">
                  {item.question.part === 1 ? (
                    <>
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
                    </>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-500 font-medium">
                        Your Drawing:
                      </span>
                      {item.drawnImage ? (
                        <img
                          src={item.drawnImage}
                          alt="Drawn stroke"
                          className="w-20 h-20 border-2 border-purple-200 rounded-lg bg-white object-contain"
                        />
                      ) : (
                        <span className="text-xs text-red-500 italic font-semibold">
                          (no stroke)
                        </span>
                      )}
                      <div className="text-xs font-bold text-purple-900 mt-1">
                        Target Kanji:{" "}
                        <span className="text-base">
                          {item.question.targetAnswer}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Example Sentence with Furigana */}
              <div className="pt-2 border-t border-gray-200/60 text-xs space-y-1">
                <div className="font-bold text-purple-900 flex items-center gap-1">
                  <span>💬</span> Example Sentence:
                </div>
                <div
                  className="text-sm text-gray-800 leading-relaxed pl-3 border-l-2 border-purple-300"
                  dangerouslySetInnerHTML={{ __html: item.question.exampleJa }}
                />
                <div className="text-gray-500 italic text-[11px] pl-3">
                  "{item.question.exampleEn}"
                </div>
              </div>
            </div>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition"
          >
            Finish Drill
          </button>
        )}
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  if (questions.length === 0 || !currentQ) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow border">
        Loading drill questions...
      </div>
    );
  }

  // --- ACTIVE DRILL VIEW ---
  return (
    <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header with Timer */}
      <div className="flex justify-between items-center border-b pb-3">
        <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-full">
          Part {currentQ.part}:{" "}
          {currentQ.part === 1 ? "漢字 → かな (Type)" : "かな → 漢字 (Draw)"}
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

      {/* Target Word Display */}
      <div className="text-center py-6 space-y-2 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="text-4xl font-black text-gray-900 tracking-wide">
          {currentQ.promptWord}
        </div>
        {/* <div className="text-xs text-gray-500 font-medium italic">
          ({currentQ.hintMeaning})
        </div> */}
      </div>

      {/* Input Area */}
      {currentQ.part === 1 ? (
        <form onSubmit={handleSubmitAnswer} className="space-y-4">
          <input
            ref={textInputRef}
            type="text"
            value={userInputText}
            onChange={(e) => setUserInputText(e.target.value)}
            placeholder="Write in kana..."
            className="w-full text-center text-2xl py-3 border-2 border-purple-500 text-gray-900 bg-white rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-100 font-semibold"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={isEvaluating}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
          >
            {isEvaluating ? "Checking..." : "Submit Answer ↵"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="relative border-2 border-dashed border-purple-400 rounded-2xl bg-white overflow-hidden touch-none flex justify-center items-center">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              className="cursor-crosshair block"
            />
            {isDrawingEmpty && (
              <span className="absolute text-gray-300 text-sm pointer-events-none font-medium">
                Draw Kanji Here
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={isEvaluating}
              className="w-1/3 py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleSubmitAnswer()}
              disabled={isEvaluating}
              className="w-2/3 py-3 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-700 transition disabled:opacity-50"
            >
              {isEvaluating ? "Checking..." : "Next Question ↵"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
