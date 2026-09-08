"use client";

import React from "react";

export type SectionType = "VOCAB" | "KANJI" | "KAIWA";

interface SectionSelectorProps {
  onSelectSection: (section: SectionType) => void;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  onSelectSection,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Select Drill Section
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onSelectSection("VOCAB")}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left"
        >
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-bold text-gray-900 text-lg">Vocabulary</h3>
          <p className="text-xs text-gray-500 mt-1">
            Chapter-wise word drills with Kana/Romaji input
          </p>
        </button>

        <button
          onClick={() => onSelectSection("KANJI")}
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
          onClick={() => onSelectSection("KAIWA")}
          className="p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition text-left opacity-50 cursor-not-allowed"
        >
          <div className="text-2xl mb-2">💬</div>
          <h3 className="font-bold text-gray-900 text-lg">Kaiwa (Dialogue)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Conversation patterns & particle responses
          </p>
        </button>
      </div>
    </div>
  );
};
