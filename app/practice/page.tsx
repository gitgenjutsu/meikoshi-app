"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QuizEngine, { Question } from "@/components/jlpt/QuizEngine";
import ScoreReviewModal from "@/components/jlpt/ScoreReviewModal";
import ClassroomDrillsHub from "@/components/ClassroomDrillsHub";
import FormPracticeDashboard from "@/components/FormPracticeDashboard";
import ReadingPracticeViewer from "@/components/ReadingPracticeViewer";

type JLPTLevel = "N5" | "N4" | "N3" | "N2" | "N1";
type PracticeMode = "VOCABULARY" | "KANJI" | "GRAMMAR" | "FULL_EXAM";
type ViewState =
  | "MAIN"
  | "CLASSROOM_HUB"
  | "CONJUGATIONS_HUB"
  | "QUIZ"
  | "READING_HUB";

interface LevelConfig {
  level: JLPTLevel;
  title: string;
  description: string;
}

const JLPT_LEVELS: LevelConfig[] = [
  {
    level: "N5",
    title: "N5 Beginner",
    description: "Basic Japanese, Hiragana, Katakana & foundational Kanji",
  },
  {
    level: "N4",
    title: "N4 Elementary",
    description: "Basic daily conversations & essential everyday grammar",
  },
  {
    level: "N3",
    title: "N3 Intermediate",
    description:
      "Bridging basic to fluent comprehension in everyday situations",
  },
  {
    level: "N2",
    title: "N2 Upper-Intermediate",
    description: "Business Japanese, news articles & complex interactions",
  },
  {
    level: "N1",
    title: "N1 Advanced",
    description:
      "Native-level fluency, complex literature & specialized topics",
  },
];

interface VocabularyRow {
  id: string;
  level: string;
  word: string;
  reading: string | null;
  meanings: string;
  example_ja: string | null;
  example_en: string | null;
}

interface GrammarRow {
  id: string;
  level: string;
  pattern?: string;
  grammar_point?: string;
  pattern_ja?: string;
  meaning?: string;
  meanings?: string;
  meaning_en?: string;
  example_ja?: string | null;
  example_en?: string | null;
}

interface KanjiRow {
  id: string;
  level: string;
  kanji?: string;
  character?: string;
  onyomi?: string | null;
  kunyomi?: string | null;
  meaning?: string;
  meanings?: string;
  meaning_en?: string;
  examples?: string | null;
}

function PracticePageContent() {
  const searchParams = useSearchParams();
  const urlLevel = searchParams.get("level")?.toUpperCase() as
    | JLPTLevel
    | undefined;

  const [view, setView] = useState<ViewState>("MAIN");
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | null>(null);
  const [selectedMode, setSelectedMode] = useState<PracticeMode | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [finalScore, setFinalScore] = useState(0);

  // Read level query param from URL on initial load
  useEffect(() => {
    if (urlLevel && ["N5", "N4", "N3", "N2", "N1"].includes(urlLevel)) {
      setSelectedLevel(urlLevel);
    }
  }, [urlLevel]);

  // Classroom Drills handler
  const handleStartClassroomQuiz = (classroomQuestions: Question[]) => {
    setQuestions(classroomQuestions);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizFinished(false);
    setView("QUIZ");
  };

  // 15-Second Auto-Advance Countdown Logic
  useEffect(() => {
    if (view !== "QUIZ" || questions.length === 0 || quizFinished) return;

    setTimeLeft(15);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAutoNext();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex, questions, quizFinished, view]);

  const handleAutoNext = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    setUserAnswers((prev) => {
      const updated = {
        ...prev,
        [currentQuestionIndex]: optionIndex,
      };

      if (currentQuestionIndex + 1 >= questions.length) {
        finishQuizWithAnswers(updated);
      }
      return updated;
    });

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const finishQuizWithAnswers = async (finalAnswers: {
    [key: number]: number;
  }) => {
    setQuizFinished(true);

    const answeredIndices = Object.keys(finalAnswers);
    let calculatedScore = 0;

    answeredIndices.forEach((key) => {
      const idx = Number(key);
      if (finalAnswers[idx] === questions[idx]?.correct_option_index) {
        calculatedScore++;
      }
    });

    setFinalScore(calculatedScore);
  };

  const finishQuiz = () => {
    finishQuizWithAnswers(userAnswers);
  };

  const handleEndQuizEarly = () => {
    finishQuiz();
  };

  const resetAll = () => {
    setView("MAIN");
    setSelectedLevel(null);
    setSelectedMode(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setErrorMessage(null);
    setQuizFinished(false);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Meikoshi JLPT Practice Platform
        </h1>

        {/* VIEW 1: MAIN NAVIGATION */}
        {view === "MAIN" && (
          <>
            {/* STEP 1: SELECT LEVEL */}
            {!selectedLevel && (
              <div>
                <p className="text-center text-gray-600 mb-6">
                  Select your target JLPT level to begin
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {JLPT_LEVELS.map((item) => {
                    return (
                      <button
                        key={item.level}
                        onClick={() => setSelectedLevel(item.level)}
                        className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition text-center flex flex-col items-center justify-between min-h-[140px]"
                      >
                        <div>
                          <span className="text-3xl font-extrabold text-blue-600 block mb-1">
                            {item.level}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 block mb-1">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 leading-relaxed">
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT MODE */}
            {selectedLevel && !selectedMode && !loading && (
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => setSelectedLevel(null)}
                    className="text-sm font-medium text-gray-500 hover:text-gray-800 underline"
                  >
                    &larr; Choose Different Level
                  </button>
                  <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
                    Level {selectedLevel}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Choose Practice Mode
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {/* CLASSROOM DRILLS CARD */}
                  <button
                    onClick={() => setView("CLASSROOM_HUB")}
                    className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
                  >
                    <div className="text-xl mb-1">🏫</div>
                    <h3 className="font-bold text-blue-900">
                      Classroom Drills
                    </h3>
                    <p className="text-xs text-blue-600 mt-1">
                      Textbook chapters, typing & stroke drills
                    </p>
                  </button>

                  {/* READING COMPREHENSION CARD */}
                  <button
                    onClick={() => setView("READING_HUB")}
                    className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition text-left"
                  >
                    <div className="text-xl mb-1">📖</div>
                    <h3 className="font-bold text-emerald-900">
                      Reading Comprehension
                    </h3>
                    <p className="text-xs text-emerald-600 mt-1">
                      Real notices, chats, flyers & situational questions
                    </p>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: CLASSROOM HUB */}
        {view === "CLASSROOM_HUB" && (
          <ClassroomDrillsHub
            onBack={() => setView("MAIN")}
            onStartQuiz={handleStartClassroomQuiz}
            selectedLevel={selectedLevel || undefined}
          />
        )}

        {/* VIEW 3: CONJUGATIONS HUB */}
        {view === "CONJUGATIONS_HUB" && (
          <FormPracticeDashboard onClose={() => setView("MAIN")} />
        )}

        {/* VIEW 4: READING HUB */}
        {view === "READING_HUB" && selectedLevel && (
          <ReadingPracticeViewer
            selectedLevel={selectedLevel}
            onClose={() => setView("MAIN")}
          />
        )}

        {/* VIEW 5: ACTIVE MULTIPLE CHOICE QUIZ */}
        {view === "QUIZ" && questions.length > 0 && !quizFinished && (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={handleEndQuizEarly}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <span>🛑</span> End & Save Results
              </button>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                  ⏱️ {timeLeft}s Left
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft <= 3 ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${(timeLeft / 15) * 100}%` }}
              ></div>
            </div>

            <QuizEngine
              key={currentQuestionIndex}
              questions={[questions[currentQuestionIndex]]}
              initialSelectedOption={userAnswers[currentQuestionIndex]}
              onSelectOption={(optionIndex) => {
                setUserAnswers((prev) => ({
                  ...prev,
                  [currentQuestionIndex]: optionIndex,
                }));
              }}
              onComplete={(score, total, answers) => {
                const selectedIdx = answers[0];
                if (selectedIdx !== undefined) {
                  handleAnswerSelect(selectedIdx);
                } else if (userAnswers[currentQuestionIndex] !== undefined) {
                  handleAnswerSelect(userAnswers[currentQuestionIndex]);
                } else {
                  handleAutoNext();
                }
              }}
            />
          </div>
        )}

        {/* LOADING & ERROR STATES */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">
              Fetching practice deck...
            </p>
          </div>
        )}

        {errorMessage && !loading && (
          <div className="max-w-md mx-auto text-center p-6 bg-red-50 border border-red-200 rounded-xl mb-6">
            <p className="text-sm font-semibold text-red-600">{errorMessage}</p>
            <button
              onClick={resetAll}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg"
            >
              Back to Selection
            </button>
          </div>
        )}

        {/* SCORE REVIEW MODAL */}
        {quizFinished && (
          <ScoreReviewModal
            questions={questions.slice(
              0,
              Math.max(
                Object.keys(userAnswers).length,
                currentQuestionIndex + 1,
              ),
            )}
            selectedAnswers={userAnswers}
            score={finalScore}
            onRestart={resetAll}
          />
        )}
      </div>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-500">
          Loading practice drills...
        </div>
      }
    >
      <PracticePageContent />
    </Suspense>
  );
}
