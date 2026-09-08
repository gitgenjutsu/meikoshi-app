"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { compressImage } from "@/lib/imageUtils";
import { ChapterUploader, ImagePreview } from "./jlpt/ChapterUploader";
import { AvailableLessons } from "./jlpt/AvailableLessons";
import { SectionSelector, SectionType } from "./jlpt/SectionSelector";

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
        return { tableName: "jlpt_vocabulary", colName: "lesson_number" };
      case "KANJI":
        return { tableName: "jlpt_classroom_kanji", colName: "chapter" };
      case "KAIWA":
        return { tableName: "jlpt_classroom_kaiwa", colName: "chapter" };
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

    let quizData = data;
    if (selectedSection === "VOCAB") {
      quizData = data.map((item, idx) => {
        // Correct Japanese answer from your DB columns
        const correctJapanese = item.word || item.reading;

        // Extract other Japanese words from the same chapter to use as wrong choices (distractors)
        const otherJapaneseWords = data
          .filter((_, i) => i !== idx)
          .map((v) => v.word || v.reading)
          .filter((val): val is string => Boolean(val));

        // Randomly pick 3 distractor words
        const shuffledDistractors = [...otherJapaneseWords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        // Fallbacks if the lesson has fewer than 4 total words uploaded
        const fallbacks = ["ともだち", "せんせい", "がくせい", "ほん"];
        let fallbackIdx = 0;
        while (shuffledDistractors.length < 3) {
          shuffledDistractors.push(fallbacks[fallbackIdx % fallbacks.length]);
          fallbackIdx++;
        }

        // Place the correct Japanese word at a random index (0 to 3)
        const correctIndex = Math.floor(Math.random() * 4);
        const options = [...shuffledDistractors];
        options.splice(correctIndex, 0, correctJapanese);

        return {
          id: item.id || String(idx),
          level: item.level || selectedLevel,
          section: "VOCABULARY",
          question_type: "MULTIPLE_CHOICE",
          prompt_text: `Select the correct Japanese reading (Hiragana/Katakana) for: "${item.meanings}"`,
          question: item.meanings, // English meaning shown in prompt/card header
          reading: correctJapanese, // Japanese word solution
          options: options, // Array of 4 JAPANESE options
          correct_option_index: correctIndex,
        };
      });
    }

    const shuffled = [...quizData].sort(() => Math.random() - 0.5);
    const selected20 = shuffled.slice(0, 20);

    onStartQuiz(selected20);
    setLoading(false);
  };

  const handleSaveAndGenerateDrill = async () => {
    const chNum = parseInt(chapterInput.trim(), 10);

    if (selectedImages.length === 0 || isNaN(chNum) || chNum <= 0) {
      showToast(
        "Please enter a valid chapter number and select images.",
        "error",
      );
      return;
    }

    if (!selectedSection) {
      showToast("Please select a section first.", "error");
      return;
    }

    const { tableName } = getSectionMetadata(selectedSection);

    try {
      const { count, error: checkError } = await supabase
        .from(tableName)
        .select("id", { count: "exact", head: true })
        .eq("lesson_number", chNum)
        .eq("level", selectedLevel);

      if (checkError) throw checkError;

      if (count && count > 0) {
        selectedImages.forEach((img) => URL.revokeObjectURL(img.url));
        setSelectedImages([]);
        setChapterInput("");
        showToast(
          `${selectedLevel} Lesson ${chNum} already exists in ${tableName}!`,
          "error",
        );
        return;
      }
    } catch (err: any) {
      console.error("Duplicate Check Error:", err);
      showToast(`Failed to verify existing lesson: ${err.message}`, "error");
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append("chapterNumber", String(chNum));
      formData.append("level", selectedLevel);

      for (const img of selectedImages) {
        const compressedFile = await compressImage(img.file);
        formData.append("files", compressedFile);
      }

      const res = await fetch("/api/extract-vocab", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result.success || !result.data) {
        throw new Error("Failed to extract vocabulary from images.");
      }

      const { data: insertedData, error: dbError } = await supabase
        .from(tableName)
        .insert(result.data)
        .select();

      if (dbError) throw dbError;

      showToast(
        `Saved ${insertedData.length} items for ${selectedLevel} Lesson ${chNum}!`,
        "success",
      );

      selectedImages.forEach((img) => URL.revokeObjectURL(img.url));
      setSelectedImages([]);
      setChapterInput("");

      await fetchUploadedChapters(selectedSection);
    } catch (err: any) {
      console.error("Processing Error:", err);
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto relative pb-12">
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 transition-all duration-300 animate-slide-in">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : toast.type === "error"
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <span>
              {toast.type === "success"
                ? "✅"
                : toast.type === "error"
                  ? "⚠️"
                  : "ℹ️"}
            </span>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={selectedSection ? () => setSelectedSection(null) : onBack}
          className="text-sm font-medium text-gray-500 hover:text-gray-800 underline"
        >
          &larr;{" "}
          {selectedSection ? "Back to Section Selection" : "Back to Main Menu"}
        </button>
        <span className="px-4 py-1.5 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
          Classroom Drills ({selectedLevel})
        </span>
      </div>

      {/* STEP 1: SELECT SECTION CARD */}
      {!selectedSection && (
        <SectionSelector onSelectSection={(sec) => setSelectedSection(sec)} />
      )}

      {/* STEP 2: UPLOAD & GENERATE DRILL OR SELECT EXISTING LESSON */}
      {selectedSection && (
        <div className="space-y-8">
          <ChapterUploader
            selectedLevel={selectedLevel}
            chapterInput={chapterInput}
            setChapterInput={setChapterInput}
            selectedImages={selectedImages}
            onFileChange={handleFileChange}
            onRemoveImage={handleRemoveImage}
            onSaveAndGenerate={handleSaveAndGenerateDrill}
            isGenerating={isGenerating}
          />

          <AvailableLessons
            selectedSection={selectedSection}
            selectedLevel={selectedLevel}
            availableChapters={availableChapters}
            loading={loading}
            onSelectChapter={handleSelectExistingChapter}
            onDeleteChapter={handleDeleteChapter}
          />
        </div>
      )}
    </div>
  );
}
