"use client";

import React from "react";
import Link from "next/link";

export default function LandingPage() {
  // Real JLPT N5 Official Score Data
  const jlptN5Result = {
    level: "N5",
    status: "PASSED",
    examDate: "July 2026",
    totalScore: 122,
    maxScore: 180,
    languageKnowledge: { score: 77, max: 120 },
    listening: { score: 45, max: 60 },
    grades: [
      { section: "Vocabulary (文字・語彙)", grade: "A" },
      { section: "Grammar (文法)", grade: "A" },
      { section: "Reading (読解)", grade: "A" },
    ],
    cefrLevel: "A1",
  };

  // Real Institute Report Data (Wasim - Rank #6 / 22)
  const institutePerformance = {
    batchName: "N4 Weekend (11 Jul – 15 Aug)",
    studentName: "Wasim",
    rank: 6,
    totalStudents: 22,
    totalPercentage: 75,
    attendance: 90,
    testsScore: 46,
    speakingAbility: 88,
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* HEADER / HERO BANNER */}
      <header className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Meikoshi Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-gray-800">
                {institutePerformance.studentName}
              </span>
              ! Track your JLPT N4 progress & class metrics.
            </p>
          </div>

          <Link
            href="/practice"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Go to Practice Mode &rarr;
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* OVERVIEW SNAPSHOT CARDS */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Overall Snapshot
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* JLPT N5 Official Score */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                <span>Official JLPT Result</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs">
                  {jlptN5Result.status}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">
                  {jlptN5Result.totalScore}
                </span>
                <span className="text-sm font-semibold text-gray-400">
                  / {jlptN5Result.maxScore}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                JLPT {jlptN5Result.level} ({jlptN5Result.examDate}) &bull; CEFR{" "}
                {jlptN5Result.cefrLevel}
              </p>
            </div>

            {/* Institute Attendance */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                <span>Class Attendance</span>
                <span className="text-xs text-emerald-600 font-semibold">
                  N4 Weekend
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {institutePerformance.attendance}%
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Active participation score
              </p>
            </div>

            {/* Institute Rank */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                <span>Batch Rank</span>
                <span className="text-xs text-indigo-600 font-semibold">
                  Top 30%
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-indigo-600">
                  #{institutePerformance.rank}
                </span>
                <span className="text-sm text-gray-400">
                  / {institutePerformance.totalStudents} Students
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Overall Score: {institutePerformance.totalPercentage}%
              </p>
            </div>
          </div>
        </section>

        {/* JLPT N5 BREAKDOWN */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                JLPT N5 Score Breakdown
              </h2>
              <p className="text-xs text-gray-500">
                Official Exam Marks & Letter Grades
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
              Score: 122/180
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs font-semibold text-gray-500 block mb-1">
                Language Knowledge (Vocab / Grammar) & Reading
              </span>
              <div className="text-2xl font-bold text-gray-900">
                {jlptN5Result.languageKnowledge.score}{" "}
                <span className="text-xs font-normal text-gray-400">
                  / {jlptN5Result.languageKnowledge.max}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs font-semibold text-gray-500 block mb-1">
                Listening (聴解)
              </span>
              <div className="text-2xl font-bold text-gray-900">
                {jlptN5Result.listening.score}{" "}
                <span className="text-xs font-normal text-gray-400">
                  / {jlptN5Result.listening.max}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {jlptN5Result.grades.map((g, idx) => (
              <div
                key={idx}
                className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center"
              >
                <span className="text-xs text-emerald-800 font-medium block">
                  {g.section}
                </span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">
                  Grade {g.grade}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* N4 INSTITUTE PERFORMANCE BREAKDOWN */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              N4 Course Performance Metrics
            </h2>
            <p className="text-xs text-gray-500">
              {institutePerformance.batchName}
            </p>
          </div>

          <div className="space-y-5">
            {/* Speaking Ability */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700">
                  Speaking Ability
                </span>
                <span className="font-bold text-emerald-600">
                  {institutePerformance.speakingAbility}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${institutePerformance.speakingAbility}%` }}
                />
              </div>
            </div>

            {/* Attendance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700">
                  Class Attendance
                </span>
                <span className="font-bold text-emerald-600">
                  {institutePerformance.attendance}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${institutePerformance.attendance}%` }}
                />
              </div>
            </div>

            {/* Test Performance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700">
                  Classroom Tests
                </span>
                <span className="font-bold text-rose-500">
                  {institutePerformance.testsScore}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${institutePerformance.testsScore}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA TO PRACTICE */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-md flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h3 className="text-2xl font-extrabold mb-1">Targeting N4 Next?</h3>
            <p className="text-blue-100 text-sm">
              Boost your 46% test score mark using Meikoshi&apos;s N4 & N5
              practice quizzes!
            </p>
          </div>
          <Link
            href="/practice"
            className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl shadow transition whitespace-nowrap"
          >
            Start Practice Drills
          </Link>
        </section>
      </div>
    </main>
  );
}
