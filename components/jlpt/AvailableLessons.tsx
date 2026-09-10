"use client";

import React from "react";
import { SectionType } from "./SectionSelector";

interface AvailableLessonsProps {
  selectedSection: SectionType;
  selectedLevel: string;
  availableChapters: number[];
  loading: boolean;
  onSelectChapter: (ch: number) => void;
  onDeleteChapter: (ch: number, e: React.MouseEvent) => void;
}

export const AvailableLessons: React.FC<AvailableLessonsProps> = ({
  selectedSection,
  selectedLevel,
  availableChapters,
  loading,
  onSelectChapter,
  onDeleteChapter,
}) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        Available Lessons ({selectedSection} - {selectedLevel})
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Select an existing chapter to practice.
      </p>

      {loading ? (
        <p className="text-xs text-gray-400">Loading chapters...</p>
      ) : availableChapters.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {availableChapters.map((ch) => (
            <div
              key={ch}
              onClick={() => onSelectChapter(ch)}
              className="relative p-4 bg-blue-50/50 border border-blue-200 rounded-xl hover:bg-blue-600 hover:text-white transition text-center cursor-pointer group"
            >
              <button
                onClick={(e) => onDeleteChapter(ch, e)}
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
          No uploaded lessons found for {selectedSection} ({selectedLevel}).
          Upload your first chapter above!
        </p>
      )}
    </div>
  );
};
