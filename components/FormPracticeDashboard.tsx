"use client";

import { N4_VERB_DATASET } from "@/app/data/n4ConjugationsData";
import React, { useState } from "react";

interface FormPracticeDashboardProps {
  onClose: () => void;
}

/** Converts bracketed text like "辛[から]い" into clean <ruby> elements strictly over Kanji */
function renderFuriganaText(text?: string, showFurigana: boolean = true) {
  if (!text) return null;
  if (!showFurigana) {
    return text.replace(/\[.*?\]/g, "");
  }

  // Matches Kanji characters (\u4e00-\u9faf\u3400-\u4dbf) followed by [reading]
  const regex = /([\u4e00-\u9faf\u3400-\u4dbf]+)\[(.*?)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push plain text prior to the match (hiragana, katakana, punctuation, spaces)
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const kanji = match[1];
    const reading = match[2];

    parts.push(
      <ruby key={match.index} className="inline-flex flex-col items-center">
        {kanji}
        <rt className="text-[10px] text-indigo-600 font-normal leading-none select-none">
          {reading}
        </rt>
      </ruby>,
    );

    lastIndex = regex.lastIndex;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

export default function FormPracticeDashboard({
  onClose,
}: FormPracticeDashboardProps) {
  const [selectedVerbId, setSelectedVerbId] = useState<string>(
    N4_VERB_DATASET[0].id,
  );
  const [activeTab, setActiveTab] = useState<"MATRIX" | "DIALOGUE">("MATRIX");
  const [showFurigana, setShowFurigana] = useState<boolean>(true);

  // Matrix state
  const [matrixInputs, setMatrixInputs] = useState<{
    [formId: string]: string;
  }>({});
  const [matrixChecked, setMatrixChecked] = useState<boolean>(false);
  const [revealedForms, setRevealedForms] = useState<{
    [formId: string]: boolean;
  }>({});

  // Dialogue state
  const [dialogueInputs, setDialogueInputs] = useState<{
    [index: number]: string;
  }>({});
  const [dialogueChecked, setDialogueChecked] = useState<boolean>(false);

  const activeVerb =
    N4_VERB_DATASET.find((v) => v.id === selectedVerbId) || N4_VERB_DATASET[0];

  const handleSelectVerb = (verbId: string) => {
    setSelectedVerbId(verbId);
    setMatrixInputs({});
    setMatrixChecked(false);
    setRevealedForms({});
    setDialogueInputs({});
    setDialogueChecked(false);
  };

  const handleMatrixInputChange = (formId: string, val: string) => {
    setMatrixInputs((prev) => ({ ...prev, [formId]: val }));
    setMatrixChecked(false);
  };

  const handleDialogueInputChange = (index: number, val: string) => {
    setDialogueInputs((prev) => ({ ...prev, [index]: val }));
    setDialogueChecked(false);
  };

  const toggleRevealForm = (formId: string) => {
    setRevealedForms((prev) => ({ ...prev, [formId]: !prev[formId] }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>⚡</span> Verb Master Hub
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            JLPT N4 • Full Verb Conjugation Matrix & Dialogue Drills
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            👁️ {showFurigana ? "Furigana On" : "Furigana Off"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* VERB SELECTOR CAPSULES */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Select Target Verb:
        </p>
        <div className="flex flex-wrap gap-2.5">
          {N4_VERB_DATASET.map((v) => {
            const isSelected = v.id === selectedVerbId;
            return (
              <button
                key={v.id}
                onClick={() => handleSelectVerb(v.id)}
                className={`px-4 py-2.5 rounded-xl text-xs transition border flex items-center gap-2 ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-md"
                    : "bg-white text-gray-800 border-gray-200 hover:border-indigo-300 font-medium"
                }`}
              >
                <span className="text-base">
                  {renderFuriganaText(v.kanjiReading, showFurigana)}
                </span>
                <span className="opacity-80">({v.meaningEn})</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded font-normal">
                  {v.verbGroup.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* VERB HERO CARD */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold rounded-md">
              {activeVerb.verbGroup}
            </span>
          </div>
          <h3 className="text-4xl font-extrabold tracking-tight">
            {renderFuriganaText(activeVerb.kanjiReading, showFurigana)}
          </h3>
          <p className="text-sm text-indigo-200 mt-1 font-medium">
            Meaning: <span className="text-white">{activeVerb.meaningEn}</span>
          </p>
        </div>

        {/* MODE SWITCH TABS */}
        <div className="flex bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("MATRIX")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "MATRIX"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📊 All-Form Matrix
          </button>
          <button
            onClick={() => setActiveTab("DIALOGUE")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "DIALOGUE"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💬 Native Dialogue Flow
          </button>
        </div>
      </div>

      {/* MODE 1: MATRIX VIEW */}
      {activeTab === "MATRIX" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-gray-100">
            <div>
              <h4 className="font-bold text-gray-900 text-sm">
                N4 Conjugation Suite
              </h4>
              <p className="text-xs text-gray-500">
                Practice converting {activeVerb.dictionaryForm} into all 4 key
                N4 structures.
              </p>
            </div>
            <button
              onClick={() => setMatrixChecked(true)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              Check All Forms
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeVerb.forms.map((form) => {
              const uVal = matrixInputs[form.formId] || "";
              const isRevealed = revealedForms[form.formId];

              let isCorrect = false;
              if (matrixChecked && uVal.trim()) {
                isCorrect = form.acceptableAnswers.some(
                  (ans) => ans.toLowerCase() === uVal.trim().toLowerCase(),
                );
              }

              return (
                <div
                  key={form.formId}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    matrixChecked && uVal.trim()
                      ? isCorrect
                        ? "bg-emerald-50/60 border-emerald-200"
                        : "bg-rose-50/60 border-rose-200"
                      : "bg-gray-50/70 border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-gray-900 text-sm">
                        {form.formNameEn}
                      </h5>
                      <p className="text-xs text-indigo-600 font-medium">
                        {form.formNameJa}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleRevealForm(form.formId)}
                      className="text-[11px] text-gray-500 hover:text-indigo-600 underline font-medium"
                    >
                      {isRevealed ? "Hide Hint" : "Show Hint"}
                    </button>
                  </div>

                  {isRevealed && (
                    <div className="p-2 bg-white rounded-lg border border-indigo-100 text-[11px] text-indigo-900">
                      💡 Rule: {form.hint}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={uVal}
                      onChange={(e) =>
                        handleMatrixInputChange(form.formId, e.target.value)
                      }
                      placeholder={`Conjugate into ${form.formNameEn.split(" ")[0]}...`}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {matrixChecked && (
                      <div className="text-xs font-semibold">
                        {isCorrect ? (
                          <p className="text-emerald-700">✓ 正解 (Correct!)</p>
                        ) : (
                          <p className="text-rose-700">
                            ✕ Expected:{" "}
                            <span className="font-bold">
                              {form.expectedConjugation}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: DIALOGUE FLOW VIEW */}
      {activeTab === "DIALOGUE" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">Conversation Scenario:</p>
            <p>{activeVerb.scenario}</p>
          </div>

          <div className="space-y-4">
            {activeVerb.dialogueFlow.map((turn, idx) => (
              <div
                key={idx}
                className={`flex gap-3 p-3.5 rounded-xl ${
                  turn.speaker === "A"
                    ? "bg-gray-50 border border-gray-100"
                    : "bg-indigo-50/50 border border-indigo-100"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    turn.speaker === "A"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {turn.speaker}
                </span>

                <div className="flex-1 text-sm space-y-2">
                  <div className="text-gray-900 leading-relaxed pt-0.5">
                    {renderFuriganaText(turn.text, showFurigana)}

                    {turn.isTargetPrompt && (
                      <span className="inline-block ml-2">
                        <input
                          type="text"
                          value={dialogueInputs[idx] || ""}
                          onChange={(e) =>
                            handleDialogueInputChange(idx, e.target.value)
                          }
                          placeholder="Type conjugation..."
                          className="px-3 py-1 bg-white border border-indigo-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 shadow-sm"
                        />
                      </span>
                    )}
                  </div>

                  {turn.isTargetPrompt && dialogueChecked && (
                    <div className="text-xs pt-1 border-t border-indigo-100">
                      {turn.acceptableAnswers?.some(
                        (a) =>
                          a.toLowerCase() ===
                          (dialogueInputs[idx] || "").trim().toLowerCase(),
                      ) ? (
                        <p className="text-emerald-700 font-bold">
                          ✓ 正解 (Correct!)
                        </p>
                      ) : (
                        <p className="text-rose-700">
                          ✕ Expected:{" "}
                          <span className="font-bold">
                            {turn.expectedAnswer}
                          </span>
                        </p>
                      )}
                      {turn.explanation && (
                        <p className="text-indigo-800 text-[11px] mt-0.5">
                          {turn.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setDialogueChecked(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Check Dialogue Answers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
