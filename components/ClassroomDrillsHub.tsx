"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ChapterUploader, ImagePreview } from "./jlpt/ChapterUploader";
import { AvailableLessons } from "./jlpt/AvailableLessons";
import { SectionSelector, SectionType } from "./jlpt/SectionSelector";
import KaiwaDashboard from "./KaiwaDashboard";
import KanjiTypingDrill from "@/components/jlpt/KanjiTypingDrill";
import FormDrillEngine from "@/components/jlpt/FormDrillEngine";

interface ClassroomDrillsHubProps {
  onBack: () => void;
  onStartQuiz: (questions: any[]) => void;
  selectedLevel?: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

// Utility helper to convert a File object into a Base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function ClassroomDrillsHub({
  onBack,
  onStartQuiz,
  selectedLevel = "N5",
}: ClassroomDrillsHubProps) {
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(
    null,
  );
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Active Drill Session States
  const [kaiwaExercises, setKaiwaExercises] = useState<any[] | null>(null);
  const [activeKanjiData, setActiveKanjiData] = useState<{
    currentLessonKanji: any[];
    previousLessonsKanji: any[];
  } | null>(null);
  const [activeFormQuestions, setActiveFormQuestions] = useState<any[] | null>(
    null,
  );

  // Upload Form States
  const [chapterInput, setChapterInput] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    const id = Date.now();
    setToast({ id, message, type });

    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  const getSectionMetadata = (section: SectionType) => {
    switch (section) {
      case "VOCAB":
        return {
          tableName: "jlpt_vocabulary",
          colName: "lesson_number",
          apiRoute: "/api/extract-vocab",
        };
      case "KANJI":
        return {
          tableName: "jlpt_kanji",
          colName: "lesson_number",
          apiRoute: "/api/extract-kanji",
        };
      case "KAIWA":
        return {
          tableName: "jlpt_kaiwa",
          colName: "lesson_number",
          apiRoute: "/api/extract-kaiwa",
        };
    }
  };

  useEffect(() => {
    if (selectedSection) {
      fetchUploadedChapters(selectedSection);
    }
  }, [selectedSection, selectedLevel]);

  const fetchUploadedChapters = async (section: SectionType) => {
    setLoading(true);
    const { tableName, colName } = getSectionMetadata(section);

    const { data, error } = await supabase
      .from(tableName)
      .select(colName)
      .eq("level", selectedLevel)
      .not(colName, "is", null);

    if (!error && data) {
      const chapters = data
        .map((item: any) => item[colName])
        .filter((ch): ch is number => ch !== null && ch !== undefined);

      const uniqueChapters = Array.from(new Set(chapters)).sort(
        (a, b) => a - b,
      );
      setAvailableChapters(uniqueChapters);
    } else if (error) {
      console.error("Error fetching chapters:", error);
      showToast("Failed to fetch available chapters.", "error");
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const newPreviews: ImagePreview[] = filesArray.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSelectedImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[indexToRemove].url);
      updated.splice(indexToRemove, 1);
      return updated;
    });
  };

  const handleDeleteChapter = async (
    chapterNum: number,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    if (
      !confirm(
        `Are you sure you want to delete ${selectedLevel} Lesson ${chapterNum}?`,
      )
    ) {
      return;
    }

    if (!selectedSection) return;
    const { tableName, colName } = getSectionMetadata(selectedSection);

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq(colName, chapterNum)
      .eq("level", selectedLevel);

    if (error) {
      showToast(`Failed to delete lesson: ${error.message}`, "error");
    } else {
      showToast(`Lesson L${chapterNum} deleted successfully.`, "success");
      fetchUploadedChapters(selectedSection);
    }
  };

  const handleSelectExistingChapter = async (chapterNum: number) => {
    if (!selectedSection) return;

    setLoading(true);
    const { tableName, colName } = getSectionMetadata(selectedSection);

    if (selectedSection === "KAIWA") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(colName, chapterNum)
        .eq("level", selectedLevel);

      if (error || !data || data.length === 0) {
        showToast("Error loading Kaiwa drill data.", "error");
        setLoading(false);
        return;
      }

      setKaiwaExercises(data);
      setLoading(false);
      return;
    }

    if (selectedSection === "KANJI") {
      const { data: currentKanji, error: currentErr } = await supabase
        .from(tableName)
        .select("*")
        .eq(colName, chapterNum)
        .eq("level", selectedLevel);

      if (currentErr || !currentKanji || currentKanji.length === 0) {
        showToast("Error loading Kanji lesson data.", "error");
        setLoading(false);
        return;
      }

      const { data: previousKanji } = await supabase
        .from(tableName)
        .select("*")
        .lt(colName, chapterNum)
        .eq("level", selectedLevel);

      setActiveKanjiData({
        currentLessonKanji: currentKanji,
        previousLessonsKanji: previousKanji || [],
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq(colName, chapterNum)
      .eq("level", selectedLevel);

    if (error || !data || data.length === 0) {
      showToast("Error loading chapter data.", "error");
      setLoading(false);
      return;
    }

    if (selectedSection === "VOCAB") {
      const quizData = data.map((item, idx) => {
        const correctJapanese = item.word || item.reading;

        const otherJapaneseWords = data
          .filter((_, i) => i !== idx)
          .map((v) => v.word || v.reading)
          .filter((val): val is string => Boolean(val));

        const shuffledDistractors = [...otherJapaneseWords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const fallbacks = ["ともだち", "せんせい", "がくせい", "ほん"];
        let fallbackIdx = 0;
        while (shuffledDistractors.length < 3) {
          shuffledDistractors.push(fallbacks[fallbackIdx % fallbacks.length]);
          fallbackIdx++;
        }

        const correctIndex = Math.floor(Math.random() * 4);
        const options = [...shuffledDistractors];
        options.splice(correctIndex, 0, correctJapanese);

        return {
          id: item.id || String(idx),
          level: item.level || selectedLevel,
          section: "VOCABULARY",
          question_type: "MULTIPLE_CHOICE",
          prompt_text: `Select the correct Japanese reading for: "${item.meanings}"`,
          question: item.meanings,
          reading: correctJapanese,
          options: options,
          correct_option_index: correctIndex,
        };
      });

      onStartQuiz(quizData);
    }

    setLoading(false);
  };

  const handleProcessAndSave = async () => {
    if (!selectedSection) return;

    const chapterNum = parseInt(chapterInput, 10);
    if (isNaN(chapterNum) || chapterNum <= 0) {
      showToast("Please enter a valid chapter number.", "error");
      return;
    }

    if (selectedImages.length === 0) {
      showToast("Please select at least one image to extract.", "error");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Convert files to base64 strings
      const base64Images = await Promise.all(
        selectedImages.map((img) => fileToBase64(img.file)),
      );

      const { apiRoute } = getSectionMetadata(selectedSection);

      // 2. Execute fetch with JSON payload
      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: base64Images,
          level: selectedLevel,
          lesson_number: chapterNum,
        }),
      });

      // 3. Read raw text response first to avoid "Unexpected end of JSON input"
      const responseText = await res.text();

      let responseData: any = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response JSON:", responseText);
        }
      }

      if (!res.ok) {
        throw new Error(
          responseData.error ||
            `Server error (${res.status}): ${res.statusText || "Empty response"}`,
        );
      }

      showToast(
        `Lesson ${chapterNum} extracted & saved successfully!`,
        "success",
      );
      setChapterInput("");
      setSelectedImages([]);
      fetchUploadedChapters(selectedSection);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "An unexpected error occurred.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (kaiwaExercises) {
    return (
      <KaiwaDashboard
        exercises={kaiwaExercises}
        onClose={() => setKaiwaExercises(null)}
      />
    );
  }

  if (activeKanjiData) {
    return (
      <KanjiTypingDrill
        currentLessonKanji={activeKanjiData.currentLessonKanji}
        previousLessonsKanji={activeKanjiData.previousLessonsKanji}
        onClose={() => setActiveKanjiData(null)}
      />
    );
  }

  if (activeFormQuestions) {
    return (
      <FormDrillEngine
        questions={activeFormQuestions}
        onClose={() => setActiveFormQuestions(null)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 relative">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 underline flex items-center gap-1"
        >
          &larr; Back
        </button>
        <span className="px-3.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
          ({selectedLevel})
        </span>
      </div>

      {!selectedSection ? (
        <SectionSelector onSelectSection={setSelectedSection} />
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <button
              onClick={() => setSelectedSection(null)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              &larr; Switch Section
            </button>
            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
              {selectedSection} DRILLS
            </h2>
          </div>

          <AvailableLessons
            selectedSection={selectedSection}
            selectedLevel={selectedLevel}
            availableChapters={availableChapters}
            loading={loading}
            onSelectChapter={handleSelectExistingChapter}
            onDeleteChapter={handleDeleteChapter}
          />

          <hr className="border-gray-100" />

          <ChapterUploader
            selectedLevel={selectedLevel}
            chapterInput={chapterInput}
            setChapterInput={setChapterInput}
            selectedImages={selectedImages}
            onFileChange={handleFileChange}
            onRemoveImage={handleRemoveImage}
            onSaveAndGenerate={handleProcessAndSave}
            isGenerating={isGenerating}
          />
        </div>
      )}
    </div>
  );
}
