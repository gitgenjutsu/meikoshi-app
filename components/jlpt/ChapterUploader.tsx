"use client";

import React from "react";

export interface ImagePreview {
  file: File;
  url: string;
}

interface ChapterUploaderProps {
  selectedLevel: string;
  chapterInput: string;
  setChapterInput: (val: string) => void;
  selectedImages: ImagePreview[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  onSaveAndGenerate: () => void;
  isGenerating: boolean;
}

export const ChapterUploader: React.FC<ChapterUploaderProps> = ({
  selectedLevel,
  chapterInput,
  setChapterInput,
  selectedImages,
  onFileChange,
  onRemoveImage,
  onSaveAndGenerate,
  isGenerating,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        Add / Upload New Chapter ({selectedLevel})
      </h3>
      <p className="text-xs text-gray-500 mb-6">
        Enter the lesson number and upload one or more textbook page photos.
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
            onChange={onFileChange}
            className="text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </div>

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
                  onClick={() => onRemoveImage(idx)}
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
        onClick={onSaveAndGenerate}
        disabled={isGenerating || selectedImages.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-md disabled:opacity-50"
      >
        {isGenerating
          ? `Processing ${selectedImages.length} Image(s)...`
          : "⚡ Save & Generate Drill"}
      </button>
    </div>
  );
};
