export interface ConjugationFormMeta {
  formId: "volitional" | "potential" | "causative_passive" | "conditionals";
  formNameEn: string;
  formNameJa: string;
  expectedConjugation: string;
  acceptableAnswers: string[];
  hint: string;
}

export interface DialogueTurn {
  speaker: "A" | "B";
  text: string;
  isTargetPrompt?: boolean;
  targetFormId?: string;
  expectedAnswer?: string;
  acceptableAnswers?: string[];
  explanation?: string;
}

export interface VerbEntity {
  id: string;
  dictionaryForm: string;
  kanjiReading: string;
  verbGroup: "Group 1 (五段)" | "Group 2 (一段)" | "Group 3 (不規則)";
  meaningEn: string;
  scenario: string;
  forms: ConjugationFormMeta[];
  dialogueFlow: DialogueTurn[];
}

export const N4_VERB_DATASET: VerbEntity[] = [
  {
    id: "taberu",
    dictionaryForm: "食べる",
    kanjiReading: "食[た]べる",
    verbGroup: "Group 2 (一段)",
    meaningEn: "to eat",
    scenario:
      "Discussing dinner options and food preferences at a spicy ramen restaurant with a friend.",
    forms: [
      {
        formId: "volitional",
        formNameEn: "Volitional (Let's eat)",
        formNameJa: "意向形 (いこうけい)",
        expectedConjugation: "食べよう",
        acceptableAnswers: ["食べよう", "たべよう", "食べようよ"],
        hint: "Drop -ru, add -yō",
      },
      {
        formId: "potential",
        formNameEn: "Potential (Can eat)",
        formNameJa: "可能形 (かのうけい)",
        expectedConjugation: "食べられる",
        acceptableAnswers: ["食べられる", "たべられる", "食べれる", "たべれる"],
        hint: "Drop -ru, add -rareru (or -reru in casual speech)",
      },
      {
        formId: "causative_passive",
        formNameEn: "Causative-Passive (Forced to eat)",
        formNameJa: "使役受身形 (しえきうけみけい)",
        expectedConjugation: "食べさせられる",
        acceptableAnswers: ["食べさせられる", "たべさせられる"],
        hint: "Drop -ru, add -saserareru",
      },
      {
        formId: "conditionals",
        formNameEn: "Conditional (If/When eat)",
        formNameJa: "条件形 (〜たら)",
        expectedConjugation: "食べたら",
        acceptableAnswers: ["食べたら", "たべたら", "食べれば", "たべれば"],
        hint: "Past ta-form + ra",
      },
    ],
    dialogueFlow: [
      {
        speaker: "A",
        text: "この激[げき]辛[から]ラーメン、結[けっ]構[こう]辛[から]いけど大[だい]丈[じょう]夫[ぶ]？",
      },
      {
        speaker: "B",
        text: "大[だい]丈[じょう]夫[ぶ]！辛[から]いものでも",
        isTargetPrompt: true,
        targetFormId: "potential",
        expectedAnswer: "食べられる",
        acceptableAnswers: ["食べられる", "たべられる", "食べれる"],
        explanation: "Potential form: Expressing ability to handle spicy food.",
      },
      {
        speaker: "A",
        text: "よかった！じゃあ、一[いっ]緒[しょ]に",
      },
      {
        speaker: "B",
        text: "うん、早[さっ]速[そく]",
        isTargetPrompt: true,
        targetFormId: "volitional",
        expectedAnswer: "食べよう",
        acceptableAnswers: ["食べよう", "たべよう", "食べようよ"],
        explanation:
          "Volitional form: Casual proposal to start eating together.",
      },
    ],
  },
  {
    id: "matsu",
    dictionaryForm: "待つ",
    kanjiReading: "待[ま]つ",
    verbGroup: "Group 1 (五段)",
    meaningEn: "to wait",
    scenario:
      "Complaining to a classmate about getting stuck in the rain waiting for a delayed bus.",
    forms: [
      {
        formId: "volitional",
        formNameEn: "Volitional (Let's wait)",
        formNameJa: "意向形 (いこうけい)",
        expectedConjugation: "待とう",
        acceptableAnswers: ["待とう", "まとう", "待とうよ"],
        hint: "Change -u to -ō",
      },
      {
        formId: "potential",
        formNameEn: "Potential (Can wait)",
        formNameJa: "可能形 (かのうけい)",
        expectedConjugation: "待てる",
        acceptableAnswers: ["待てる", "まてる"],
        hint: "Change -u to -eru",
      },
      {
        formId: "causative_passive",
        formNameEn: "Causative-Passive (Forced to wait)",
        formNameJa: "使役受身形 (しえきうけみけい)",
        expectedConjugation: "待たされる",
        acceptableAnswers: ["待たされる", "またされる", "待たされた"],
        hint: "G1 shortened form: -u -> -asareru",
      },
      {
        formId: "conditionals",
        formNameEn: "Conditional (If/When wait)",
        formNameJa: "条件形 (〜たら)",
        expectedConjugation: "待ったら",
        acceptableAnswers: ["待ったら", "まったら", "待てば"],
        hint: "Past ta-form + ra",
      },
    ],
    dialogueFlow: [
      {
        speaker: "A",
        text: "昨[きのう]日[ひ]の雨[あめ]、大[だい]変[へん]だったね。バス来[き]た？",
      },
      {
        speaker: "B",
        text: "全[ぜん]然[ぜん]来[こ]なくて、雨[あめ]の全[なか]で1時[じ]間[かん]も",
        isTargetPrompt: true,
        targetFormId: "causative_passive",
        expectedAnswer: "待たされた",
        acceptableAnswers: ["待たされた", "またされた", "待たされる"],
        explanation:
          "Causative-Passive: Expressing frustration at being forced to wait.",
      },
      {
        speaker: "A",
        text: "それはひどいね... 次[つぎ]からは店[みせ]の 中[なか]で",
      },
      {
        speaker: "B",
        text: "そうだね、次[つぎ]はカフェで",
        isTargetPrompt: true,
        targetFormId: "volitional",
        expectedAnswer: "待とう",
        acceptableAnswers: ["待とう", "まとう", "待とうよ"],
        explanation:
          "Volitional form: Deciding/proposing to wait inside next time.",
      },
    ],
  },
];
