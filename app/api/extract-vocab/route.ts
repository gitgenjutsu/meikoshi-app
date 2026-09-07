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
            mimeType: file.type,
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
                description: "Kanji or word in Japanese",
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
            required: ["word", "meanings"],
          },
        },
      },
    });

    const prompt = `
      Extract all vocabulary words across these ${files.length} textbook page(s) for Lesson ${chapterNumber}.
      Combine all words from all pages into a single flat array without duplicates.
      For each word:
      1. 'word': The Japanese kanji/word as written.
      2. 'reading': Hiragana/Katakana reading.
      3. 'meanings': Concise English translation.
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const extractedVocab = JSON.parse(result.response.text());

    const formattedRows = extractedVocab.map((item: any) => ({
      level,
      lesson_number: Number(chapterNumber),
      word: item.word,
      reading: item.reading || null,
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
