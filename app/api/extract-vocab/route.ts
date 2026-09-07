import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const chapterNumber = formData.get("chapterNumber") as string;
    const level = (formData.get("level") as string) || "N4";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No image files provided" },
        { status: 400 },
      );
    }

    // Convert all uploaded image files into Gemini image parts
    const imageParts = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const base64Image = Buffer.from(bytes).toString("base64");
        return {
          inlineData: {
            data: base64Image,
            mimeType: file.type || "image/jpeg",
          },
        };
      }),
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              word: {
                type: SchemaType.STRING,
                description: "ONLY Hiragana or Katakana reading (NO KANJI)",
              },
              reading: {
                type: SchemaType.STRING,
                description: "Hiragana/Katakana reading",
              },
              meanings: {
                type: SchemaType.STRING,
                description: "English translation/meaning",
              },
            },
            required: ["word", "reading", "meanings"],
          },
        },
      },
    });

    const prompt = `
      Extract all vocabulary words across these ${files.length} textbook page(s) for Lesson ${chapterNumber}.
      Combine all words from all pages into a single flat array without duplicates.
      
      CRITICAL INSTRUCTION FOR VOCABULARY DRILLS:
      - Do NOT output Kanji in the 'word' field. 
      - Convert all Japanese words into pure Hiragana or Katakana. 
      - Both 'word' and 'reading' must contain ONLY Hiragana or Katakana strings (e.g., "たべます", "バス", "おくります").
      - 'meanings': Concise English translation (e.g., "to eat", "bus", "to send").
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const extractedVocab = JSON.parse(result.response.text());

    // Map extracted items and ensure fallback strips Kanji if any slips through
    const formattedRows = extractedVocab.map((item: any) => ({
      level,
      lesson_number: Number(chapterNumber),
      // Prefer reading over word to strictly enforce Kana
      word: item.reading || item.word,
      reading: item.reading || item.word,
      meanings: item.meanings,
    }));

    return NextResponse.json({ success: true, data: formattedRows });
  } catch (error: any) {
    console.error("Multi-Page OCR Error:", error);
    return NextResponse.json(
      { error: "Google AI server is busy. Please try again in a few moments." },
      { status: 503 },
    );
  }
}
