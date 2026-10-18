import React from "react";

interface FuriganaTextProps {
  text: string;
  className?: string;
}

export function FuriganaText({ text, className = "" }: FuriganaTextProps) {
  // Regex matches Kanji followed by [reading] e.g. 辛[から]
  const regex = /([\u4e00-\u9faf\u3400-\u4dbf]+)\[(.*?)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const kanji = match[1];
    const reading = match[2];

    parts.push(
      <ruby key={match.index} className="inline-flex flex-col items-center">
        {kanji}
        <rt className="text-[10px] text-indigo-500 font-normal leading-none select-none">
          {reading}
        </rt>
      </ruby>,
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
