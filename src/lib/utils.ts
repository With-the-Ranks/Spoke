import Crypto from "crypto";
import fs from "fs";
import isEqual from "lodash/isEqual";
import isObject from "lodash/isObject";
import transform from "lodash/transform";
import os from "os";
import path from "path";
import request from "superagent";

export type TempDownloadHandler = (
  filePath: string
) => Promise<unknown> | unknown;

export const VALID_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/3gpp",
  "video/mp4"
];

export const sleep = (ms = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Deep diff between two object, using lodash
 * @param  object Object compared
 * @param  base   Object to compare with
 * @return Return a new object who represent the diff
 */
export const difference = (
  object: Record<string, unknown>,
  base: Record<string, unknown>
): Record<string, unknown> => {
  const changes = (
    obj: Record<string, unknown>,
    ref: Record<string, unknown>
  ): Record<string, unknown> =>
    transform(
      obj,
      (result: Record<string, unknown>, value: unknown, key: string) => {
        if (!isEqual(value, ref[key])) {
          result[key] =
            isObject(value) && isObject(ref[key])
              ? changes(
                  value as Record<string, unknown>,
                  ref[key] as Record<string, unknown>
                )
              : value;
        }
      }
    );
  return changes(object, base);
};

export const downloadFromUrl = async (
  url: string,
  filePath: string
): Promise<boolean> => {
  let fileDownloaded = false;
  const file = fs.createWriteStream(filePath);

  file.on("error", () => {
    fileDownloaded = false;
    fs.unlinkSync(filePath);
  });

  const fileWritePromise = new Promise((resolve) => {
    file.on("finish", () => {
      fileDownloaded = true;
      file.close();
      resolve(true);
    });
  });

  try {
    const downloadRequest = request.get(url);
    downloadRequest.pipe(file);
    fileDownloaded = true;
  } catch (e) {
    fileDownloaded = false;
    fs.unlinkSync(filePath);
  }

  await fileWritePromise;
  return fileDownloaded;
};

export const withTempDownload = async (
  fileUrl: string,
  handler: TempDownloadHandler
): Promise<unknown> => {
  const tempFilePath = path.join(
    os.tmpdir(),
    `tempFile-${Crypto.randomBytes(16).toString("hex")}`
  );
  const fileDownloaded = await downloadFromUrl(fileUrl, tempFilePath);

  if (!fileDownloaded) return false;

  const result = await handler(tempFilePath);

  fs.unlinkSync(tempFilePath);
  return result;
};

export const stringIsAValidUrl = (s: string): boolean => {
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};

export const asPercent = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : (numerator / denominator) * 100;

export const asPercentWithTotal = (
  numerator: number,
  denominator: number
): string => {
  const pct = asPercent(numerator, denominator);
  const formatted = Number.isInteger(pct) ? pct.toString() : pct.toFixed(1);
  return `${formatted}%(${numerator})`;
};

export const replaceAll = (
  str: string,
  find: string,
  replace: string
): string => str.replaceAll(find, replace);
