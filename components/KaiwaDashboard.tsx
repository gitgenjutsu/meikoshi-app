"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Award,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface DialogueLine {
  speaker: string;
  text: string;
}

interface Variation {
  var_number: string; // 'れい', '1', '2'
  prompt_text: string;
  target_conjugation: string;
  full_lines: DialogueLine[];
  full_b_line?: string; // fallback
}

interface Exercise {
  id: string;
  exercise_number: number; // 1, 2, 3 -> C1, C2, C3
  grammar_point: string;
  dialogue_template: {
    lines: DialogueLine[];
  };
  variations: Variation[];
}

interface KaiwaDashboardProps {
  exercises: Exercise[];
}

export default function KaiwaDashboard({ exercises }: KaiwaDashboardProps) {
  const [selectedExerciseIdx, setSelectedExerciseIdx] = useState<number>(0);
  const [selectedVarIdx, setSelectedVarIdx] = useState<number>(0);

  // Speech Recognition & Timer state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [transcript, setTranscript] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExercise = exercises?.[selectedExerciseIdx] || exercises?.[0];
  const currentVariation =
    currentExercise?.variations?.[selectedVarIdx] ||
    currentExercise?.variations?.[0];

  // Helper to extract clean Japanese text (strips furigana brackets & HTML)
  const cleanJapanese = (text: string) => {
    return text
      .replace(/\[.*?\]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[、。！？\s]/g, "");
  };

  // Build target combined text for full dialogue
  const getTargetDialogueText = () => {
    if (!currentVariation) return "";
    if (currentVariation.full_lines && currentVariation.full_lines.length > 0) {
      return currentVariation.full_lines.map((l) => l.text).join("");
    }
    // Fallback if legacy structure
    return (
      (currentExercise?.dialogue_template.lines[0]?.text || "") +
      (currentVariation.full_b_line || "") +
      (currentExercise?.dialogue_template.lines[2]?.text || "")
    );
  };

  // Play Full Native Audio (TTS)
  const handlePlayNativeAudio = () => {
    if (!("speechSynthesis" in window)) {
      alert("TTS is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const fullText = cleanJapanese(getTargetDialogueText());
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  // Levenshtein Distance & Scoring Algorithm (Out of 10)
  const evaluateSpeech = (userText: string) => {
    const cleanTarget = cleanJapanese(getTargetDialogueText());
    const cleanUser = cleanJapanese(userText);

    if (!cleanUser || cleanUser.length === 0) {
      setScore(0);
      setFeedback("No speech detected. Please try again!");
      return;
    }

    const m = cleanTarget.length;
    const n = cleanUser.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0),
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (cleanTarget[i - 1] === cleanUser[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    const editDistance = dp[m][n];
    const maxLength = Math.max(m, n);
    const similarity = 1 - editDistance / maxLength;
    const finalScore = Math.min(10, Math.max(0, Math.round(similarity * 10)));

    setScore(finalScore);
    if (finalScore >= 9) setFeedback("素晴らしい！ Perfect pronunciation!");
    else if (finalScore >= 7) setFeedback("Great job! Almost accurate.");
    else if (finalScore >= 5) setFeedback("Good effort! Practice once more.");
    else setFeedback("Keep trying! Focus on repeating all lines.");
  };

  // Timer Management
  useEffect(() => {
    if (isListening && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isListening) {
      stopListening();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isListening, timeLeft]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    setTranscript("");
    setScore(null);
    setFeedback("");
    setTimeLeft(15);
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = !isMobile;
    recognition.interimResults = false;

    let fullTranscript = "";

    recognition.onresult = (event: any) => {
      let latestTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          latestTranscript += event.results[i][0].transcript;
        }
      }

      const cleanText = latestTranscript.trim();
      if (cleanText) {
        fullTranscript = fullTranscript
          ? `${fullTranscript} ${cleanText}`
          : cleanText;
        setTranscript(fullTranscript);
      }
    };

    // FIX 1: Ignore recoverable mobile speech recognition errors
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      console.error("Speech Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Evaluate only if speech was actually captured
      if (fullTranscript.trim()) {
        evaluateSpeech(fullTranscript);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // Triggers recognition.onend automatically
    }
    setIsListening(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const resetPractice = () => {
    setTranscript("");
    setScore(null);
    setFeedback("");
    setTimeLeft(15);
  };

  if (!exercises || exercises.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl border">
        <p className="font-semibold">
          No Kaiwa exercises found for this lesson.
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Please extract or upload the lesson material first.
        </p>
      </div>
    );
  }

  // Render text with Furigana & HTML (e.g. <u>)
  const renderFormattedText = (rawText: string) => {
    // Replace furigana pattern Word[reading] with ruby tags
    const rubyFormatted = rawText.replace(
      /([一-龯]+)\[(.*?)\]/g,
      "<ruby>$1<rt>$2</rt></ruby>",
    );
    return <span dangerouslySetInnerHTML={{ __html: rubyFormatted }} />;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Exercise Card Selection (C1, C2, C3) */}
      <div className="flex gap-3 border-b pb-3">
        {exercises.map((ex, idx) => (
          <button
            key={ex.id || idx}
            onClick={() => {
              setSelectedExerciseIdx(idx);
              setSelectedVarIdx(0);
              resetPractice();
            }}
            className={`px-5 py-2.5 rounded-lg font-semibold transition ${
              selectedExerciseIdx === idx
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Card C{ex.exercise_number || idx + 1}
          </button>
        ))}
      </div>

      {/* Selected Exercise Header */}
      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold uppercase tracking-wide text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Grammar: {currentExercise?.grammar_point}
          </span>
        </div>

        {/* Variation Sub-Tabs (れい, 1, 2) */}
        <div className="flex gap-2 pt-2">
          {currentExercise?.variations.map((v, vIdx) => (
            <button
              key={vIdx}
              onClick={() => {
                setSelectedVarIdx(vIdx);
                resetPractice();
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                selectedVarIdx === vIdx
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v.var_number === "れい"
                ? "れい (Example)"
                : `Variation ${v.var_number}`}
            </button>
          ))}
        </div>

        {/* Prompt Cues */}
        {currentVariation?.prompt_text && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-sm">
            <strong>Prompt Cues: </strong>
            {renderFormattedText(currentVariation.prompt_text)}
          </div>
        )}

        {/* Dialogue Display */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Target Dialogue Script
          </h4>
          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
            {(
              currentVariation?.full_lines ||
              currentExercise?.dialogue_template.lines
            ).map((line, lIdx) => (
              <div key={lIdx} className="flex gap-3 text-lg leading-relaxed">
                <span className="font-bold text-blue-600 w-6">
                  {line.speaker}:
                </span>
                <div className="text-gray-800">
                  {renderFormattedText(line.text)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
          <button
            onClick={handlePlayNativeAudio}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            <Volume2 className="w-5 h-5" />
            Listen Native Audio
          </button>

          <div className="flex items-center gap-3">
            {isListening ? (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg animate-pulse hover:bg-red-700"
              >
                <MicOff className="w-5 h-5" />
                Stop & Evaluate ({timeLeft}s)
              </button>
            ) : (
              <button
                onClick={startListening}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition"
              >
                <Mic className="w-5 h-5" />
                Start Speaking Practice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Score & Evaluation Feedback Result */}
      {score !== null && (
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              <h3 className="font-bold text-lg">Evaluation Score</h3>
            </div>
            <div className="text-2xl font-black text-blue-600">
              {score} / 10
            </div>
          </div>

          <p className="font-medium text-gray-700">{feedback}</p>

          {transcript && (
            <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-600 space-y-1">
              <span className="font-semibold text-gray-500 block">
                Recognized Spoken Speech:
              </span>
              <p className="italic">"{transcript}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
