import { getCharCount } from "@trt2/gsm-charset-utils";

const gsmReplacements = [
  ["‘", "'"],
  ["’", "'"],
  ["”", '"'],
  ["”", '"'],
  ["“", '"'],
  ["–", "-"]
];

export const replaceEasyGsmWins = (text: string) =>
  gsmReplacements.reduce(
    (acc, replacement) => acc.replace(replacement[0], replacement[1]),
    text
  );

export const getSpokeCharCount = (
  text: string,
  customFieldAverageLengths: Record<string, number> = {}
) =>
  getCharCount(
    replaceEasyGsmWins(
      text.replace(/\{([^{}]+)\}/g, (token, fieldName: string) => {
        const averageLength = customFieldAverageLengths[fieldName];
        return averageLength > 0 ? "x".repeat(averageLength) : token;
      })
    )
  );

export const replaceCurlyApostrophes = (rawText: string) =>
  rawText.replace(/[\u2018\u2019]/g, "'");
