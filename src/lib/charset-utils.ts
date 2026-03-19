import { getCharCount } from "@trt2/gsm-charset-utils";

const gsmReplacements = [
  ["‘", "'"],
  ["’", "'"],
  ["”", '"'],
  ["”", '"'],
  ["“", '"'],
  ["–", "-"]
];

export const replaceEasyGsmWins = (text: string): string =>
  gsmReplacements.reduce(
    (acc, replacement) => acc.replace(replacement[0], replacement[1]),
    text
  );

export const getSpokeCharCount = (
  text: string
): ReturnType<typeof getCharCount> => getCharCount(replaceEasyGsmWins(text));

export const replaceCurlyApostrophes = (rawText: string): string =>
  rawText.replace(/[\u2018\u2019]/g, "'");
