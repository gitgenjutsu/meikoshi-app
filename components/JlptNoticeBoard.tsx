"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface JlptNoticeRow {
  id: string;
  title: string;
  notice_type: string;
  target_session: string | null;
  event_date: string | null;
  registration_start: string | null;
  registration_end: string | null;
  official_link: string | null;
  is_active: boolean;
}

const DEFAULT_NOTICE: JlptNoticeRow = {
  id: "default",
  title: "December 2026 JLPT",
  notice_type: "exam_date",
  target_session: "December 2026",
  event_date: "2026-12-06T09:00:00Z",
  registration_start: "2026-08-01T00:00:00Z",
  registration_end: "2026-09-20T23:59:59Z",
  official_link: "https://www.jlpt.jp/e/",
  is_active: true,
};

export default function JlptNoticeBoard({
  onSelectLevel,
}: {
  onSelectLevel?: (level: string) => void;
}) {
  const [notice, setNotice] = useState<JlptNoticeRow>(DEFAULT_NOTICE);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    async function fetchActiveNotice() {
      try {
        const { data, error } = await supabase
          .from("jlpt_notices")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setNotice(data);
        }
      } catch (err) {
        console.warn("Using default notice fallback:", err);
      }
    }
    fetchActiveNotice();
  }, []);

  useEffect(() => {
    if (!notice.event_date) return;
    const targetDate = new Date(notice.event_date).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [notice.event_date]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "TBA";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-10">
      {/* HERO / COUNTDOWN BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-xs font-bold rounded-full border border-white/20 uppercase tracking-wide">
              📢 Official JLPT Notice
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {notice.title}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-md">
              Target Session: {notice.target_session || "Upcoming Exam"}
            </p>
          </div>

          {/* COUNTDOWN TIMER */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center flex gap-3 sm:gap-4 justify-center items-center">
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-black">
                {timeLeft.days}
              </span>
              <span className="text-[10px] uppercase font-semibold text-blue-200">
                Days
              </span>
            </div>
            <span className="text-2xl font-light text-blue-200">:</span>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-black">
                {timeLeft.hours}
              </span>
              <span className="text-[10px] uppercase font-semibold text-blue-200">
                Hrs
              </span>
            </div>
            <span className="text-2xl font-light text-blue-200">:</span>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-black">
                {timeLeft.minutes}
              </span>
              <span className="text-[10px] uppercase font-semibold text-blue-200">
                Min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KEY DATES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Registration Window
          </span>
          <p className="text-sm font-bold text-gray-900">
            {formatDate(notice.registration_start)} –{" "}
            {formatDate(notice.registration_end)}
          </p>
          <p className="text-xs text-gray-500">
            Verify deadlines with your local registration host portal.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Exam Date
          </span>
          <p className="text-sm font-bold text-gray-900">
            {formatDate(notice.event_date)}
          </p>
          <p className="text-xs text-gray-500">
            Report early with your printed test voucher & photo ID.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Official Guidelines
          </span>
          <p className="text-sm font-bold text-gray-900">Online Access</p>
          <a
            href={notice.official_link || "https://www.jlpt.jp/e/"}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-blue-600 hover:underline font-semibold"
          >
            Open Official Portal ↗
          </a>
        </div>
      </div>

      {/* LEVEL SELECTION TILES */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm">
          Select Level to Begin Practice
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["N5", "N4", "N3", "N2", "N1"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => onSelectLevel && onSelectLevel(lvl)}
              className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-400 rounded-xl text-center transition group"
            >
              <span className="block text-lg font-black text-slate-800 group-hover:text-blue-600">
                {lvl}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Practice Drills
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
