"use client";

import React, { useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({
    sem1: true,
    sem2: true,
    other: true,
  });

  const toggleSemester = (semKey: string) => {
    setOpenSemesters((prev) => ({ ...prev, [semKey]: !prev[semKey] }));
  };

  // Filter chapters based on search query
  const filteredChapters = availableChapters.filter((ch) =>
    ch.toString().includes(searchTerm.trim()),
  );

  // Dynamic Semester Range based on Section (Kanji vs General Bunpo/Vocab/Kaiwa)
  const isKanjiSection = selectedSection === "KANJI";
  const sem1Min = isKanjiSection ? 19 : 26;
  const sem1Max = isKanjiSection ? 31 : 38;
  const sem2Min = isKanjiSection ? 32 : 39;
  const sem2Max = isKanjiSection ? 45 : 50;

  // Grouping logic based on active section ranges
  const sem1Chapters = filteredChapters.filter(
    (ch) => ch >= sem1Min && ch <= sem1Max,
  );
  const sem2Chapters = filteredChapters.filter(
    (ch) => ch >= sem2Min && ch <= sem2Max,
  );
  const otherChapters = filteredChapters.filter(
    (ch) => ch < sem1Min || (ch > sem1Max && ch < sem2Min) || ch > sem2Max,
  );

  const renderChapterGrid = (
    chapters: number[],
    accentTheme: "indigo" | "emerald" | "blue",
  ) => {
    const themeStyles = {
      indigo: {
        card: "bg-indigo-50/40 border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600",
        label: "text-indigo-400 group-hover:text-indigo-100",
        num: "text-indigo-900 group-hover:text-white",
      },
      emerald: {
        card: "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-600 hover:border-emerald-600",
        label: "text-emerald-500 group-hover:text-emerald-100",
        num: "text-emerald-950 group-hover:text-white",
      },
      blue: {
        card: "bg-blue-50/40 border-blue-100 hover:bg-blue-600 hover:border-blue-600",
        label: "text-blue-500 group-hover:text-blue-100",
        num: "text-blue-900 group-hover:text-white",
      },
    }[accentTheme];

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5 pt-3">
        {chapters.map((ch) => (
          <div
            key={ch}
            onClick={() => onSelectChapter(ch)}
            className={`relative p-2.5 border rounded-xl transition text-center cursor-pointer group shadow-xs ${themeStyles.card}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChapter(ch, e);
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md z-10 hover:bg-red-700"
              title="Delete lesson"
            >
              ✕
            </button>
            <span
              className={`text-[10px] font-bold block uppercase tracking-wider ${themeStyles.label}`}
            >
              Lesson
            </span>
            <span className={`text-base font-black ${themeStyles.num}`}>
              L{ch}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 font-sans">
      {/* HEADER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Available Lessons ({selectedSection} - {selectedLevel})
          </h3>
          <p className="text-xs text-gray-500">
            Select an existing chapter to practice ({availableChapters.length}{" "}
            uploaded).
          </p>
        </div>

        {availableChapters.length > 0 && (
          <div className="relative w-full sm:w-44">
            <input
              type="text"
              placeholder="Search L32, L39..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-7 py-1.5 text-xs text-gray-900 placeholder-gray-400 font-medium bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:text-gray-900 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT STATES */}
      {loading ? (
        <p className="text-xs text-gray-400 py-4 text-center animate-pulse">
          Loading chapters...
        </p>
      ) : availableChapters.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center">
          No uploaded lessons found for {selectedSection} ({selectedLevel}).
          Upload your first chapter below!
        </p>
      ) : filteredChapters.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">
          No lessons match &quot;{searchTerm}&quot;.
        </p>
      ) : (
        <div className="space-y-3">
          {/* SEMESTER 1 GROUP */}
          {sem1Chapters.length > 0 && (
            <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                onClick={() => toggleSemester("sem1")}
                className="w-full px-4 py-2.5 bg-indigo-50/50 flex justify-between items-center text-left hover:bg-indigo-50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded">
                    Sem 1
                  </span>
                  <span className="text-xs font-bold text-indigo-950">
                    Lessons {sem1Min} – {sem1Max} ({sem1Chapters.length}{" "}
                    available)
                  </span>
                </div>
                <span className="text-xs font-bold text-indigo-400">
                  {openSemesters.sem1 ? "▲" : "▼"}
                </span>
              </button>
              {openSemesters.sem1 && (
                <div className="p-3 pt-0">
                  {renderChapterGrid(sem1Chapters, "indigo")}
                </div>
              )}
            </div>
          )}

          {/* SEMESTER 2 GROUP */}
          {sem2Chapters.length > 0 && (
            <div className="border border-emerald-100 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                onClick={() => toggleSemester("sem2")}
                className="w-full px-4 py-2.5 bg-emerald-50/50 flex justify-between items-center text-left hover:bg-emerald-50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded">
                    Sem 2
                  </span>
                  <span className="text-xs font-bold text-emerald-950">
                    Lessons {sem2Min} – {sem2Max} ({sem2Chapters.length}{" "}
                    available)
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  {openSemesters.sem2 ? "▲" : "▼"}
                </span>
              </button>
              {openSemesters.sem2 && (
                <div className="p-3 pt-0">
                  {renderChapterGrid(sem2Chapters, "emerald")}
                </div>
              )}
            </div>
          )}

          {/* OTHER LESSONS */}
          {otherChapters.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                onClick={() => toggleSemester("other")}
                className="w-full px-4 py-2.5 bg-gray-50 flex justify-between items-center text-left hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-600 text-white rounded">
                    General
                  </span>
                  <span className="text-xs font-bold text-gray-800">
                    Other Lessons ({otherChapters.length} available)
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {openSemesters.other ? "▲" : "▼"}
                </span>
              </button>
              {openSemesters.other && (
                <div className="p-3 pt-0">
                  {renderChapterGrid(otherChapters, "blue")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
