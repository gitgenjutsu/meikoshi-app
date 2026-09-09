import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lessonNumber =
    searchParams.get("lessonNumber") || searchParams.get("lesson_number");
  const level = searchParams.get("level") || "N4";

  try {
    let query = supabase.from("jlpt_kaiwa").select("*").eq("level", level);

    if (lessonNumber) {
      query = query.eq("lesson_number", Number(lessonNumber));
    }

    const { data, error } = await query
      .order("lesson_number", { ascending: true })
      .order("exercise_number", { ascending: true });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract unique available lesson numbers for rendering Lesson Selection Cards
    const availableLessons = Array.from(
      new Set((data || []).map((item) => item.lesson_number)),
    ).sort((a, b) => a - b);

    return NextResponse.json({
      success: true,
      availableLessons,
      data: data || [],
    });
  } catch (err: any) {
    console.error("Kaiwa GET Route Error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
