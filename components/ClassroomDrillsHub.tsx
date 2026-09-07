"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type SectionType = "VOCAB" | "KANJI" | "KAIWA";

interface ClassroomDrillsHubProps {
  onBack: () => void;
  onStartQuiz: (questions: any[]) => void;
  selectedLevel?: string;
}

interface ImagePreview {
  file: File;
  url: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

const compressImage = (
  file: File,
  maxWidth = 1600,
  quality = 0.8,
): Promise<File> => {
  return new Promise((resolve) => {
    if (file.size < 1024 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => resolve(file);
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

    // Auto dismiss after 4 seconds
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
        const otherMeanings = data
          .filter((_, i) => i !== idx)
          .map((v) => v.meanings);

        const shuffledDistractors = [...otherMeanings]
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        while (shuffledDistractors.length < 3) {
          shuffledDistractors.push("Incorrect Meaning");
        }

        const correctIndex = Math.floor(Math.random() * 4);
        const options = [...shuffledDistractors];
        options.splice(correctIndex, 0, item.meanings);

        return {
          id: item.id || String(idx),
          level: item.level || selectedLevel,
          section: "VOCABULARY",
          question_type: "MULTIPLE_CHOICE",
          prompt_text: `Select the correct English meaning for "${item.word}".`,
          question: item.word,
          reading: item.reading,
          options,
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
        throw new Error(
          result.error || "Failed to extract vocabulary from images.",
        );
      }

      const { tableName } = getSectionMetadata(selectedSection);

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
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Select Drill Section
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedSection("VOCAB")}
              className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
            >
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-bold text-gray-900 text-lg">Vocabulary</h3>
              <p className="text-xs text-gray-500 mt-1">
                Chapter-wise word drills with Kana/Romaji input
              </p>
            </button>

            <button
              onClick={() => setSelectedSection("KANJI")}
              disabled
              className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left opacity-50 cursor-not-allowed"
            >
              <div className="text-2xl mb-2">漢</div>
              <h3 className="font-bold text-gray-900 text-lg">Kanji</h3>
              <p className="text-xs text-gray-500 mt-1">
                Chapter-wise character & reading practice
              </p>
            </button>

            <button
              disabled
              onClick={() => setSelectedSection("KAIWA")}
              className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left opacity-50 cursor-not-allowed"
            >
              <div className="text-2xl mb-2">💬</div>
              <h3 className="font-bold text-gray-900 text-lg">
                Kaiwa (Dialogue)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Conversation patterns & particle responses
              </p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD & GENERATE DRILL OR SELECT EXISTING LESSON */}
      {selectedSection && (
        <div className="space-y-8">
          {/* MULTI-PAGE UPLOAD FORM */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Add / Upload New Chapter ({selectedLevel})
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Enter the lesson number and upload one or more textbook page
              photos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chapter Number
                </label>
                <input
                  type="number"
                  placeholder="e.g. 26"
                  value={chapterInput}
                  onChange={(e) => setChapterInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Upload Textbook Images (Multiple)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            {/* PREVIEW MULTIPLE IMAGES GRID */}
            {selectedImages.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-700 mb-2">
                  Selected Pages ({selectedImages.length}):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group bg-gray-50 rounded-xl overflow-hidden border border-gray-200 h-36 flex items-center justify-center"
                    >
                      <img
                        src={img.url}
                        alt={`Page preview ${idx + 1}`}
                        className="h-full w-full object-contain p-1"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold flex items-center justify-center opacity-80 hover:opacity-100 transition shadow"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Page {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAndGenerateDrill}
              disabled={isGenerating || selectedImages.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50"
            >
              {isGenerating
                ? `Processing ${selectedImages.length} Image(s)...`
                : "⚡ Save & Generate Drill"}
            </button>
          </div>

          {/* AVAILABLE LESSONS */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Available Lessons ({selectedSection} - {selectedLevel})
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an existing chapter to generate a random 20-question drill.
            </p>

            {loading ? (
              <p className="text-xs text-gray-400">Loading chapters...</p>
            ) : availableChapters.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {availableChapters.map((ch) => (
                  <div
                    key={ch}
                    onClick={() => handleSelectExistingChapter(ch)}
                    className="relative p-4 bg-blue-50/50 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white transition text-center cursor-pointer group"
                  >
                    <button
                      onClick={(e) => handleDeleteChapter(ch, e)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      title="Delete lesson"
                    >
                      ✕
                    </button>
                    <span className="text-xs font-semibold block text-blue-500 group-hover:text-blue-100">
                      Lesson
                    </span>
                    <span className="text-xl font-black text-blue-900 group-hover:text-white">
                      L{ch}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300 text-center">
                No uploaded lessons found for {selectedSection} ({selectedLevel}
                ). Upload your first chapter above!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
