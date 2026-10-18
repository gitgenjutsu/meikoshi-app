"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JlptNoticeBoard from "@/components/JlptNoticeBoard";

export default function LandingPage() {
  const router = useRouter();

  const handleSelectLevel = (level: string) => {
    // Navigate to practice page with selected level parameter
    router.push(`/practice?level=${level}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* HEADER / NAVIGATION BAR */}
      <header className="bg-white border-b border-gray-200 py-6 px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Meikoshi Practice Platform
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Official JLPT Information Hub & Interactive Study Drills
            </p>
          </div>

          <Link
            href="/practice"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Launch Practice Mode &rarr;
          </Link>
        </div>
      </header>

      {/* DYNAMIC JLPT NOTICE BOARD & COUNTDOWN */}
      <div className="px-4 sm:px-6 lg:px-8">
        <JlptNoticeBoard onSelectLevel={handleSelectLevel} />
      </div>
    </main>
  );
}
