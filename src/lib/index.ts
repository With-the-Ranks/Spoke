import zlib from "zlib";

import { getFormattedPhoneNumber } from "./phone-format";
import { sleep } from "./utils";

export { getFormattedPhoneNumber };

export {
  getFormattedZip,
  zipToTimeZone,
  getCommonZipRanges
} from "./zip-format";

export { isClient } from "./is-client";
export { sleep };
export {
  findParent,
  getInteractionPath,
  getInteractionTree,
  interactionStepForId,
  getTopMostParent,
  getChildren,
  makeTree
} from "./interaction-step-helpers";

export { ROLE_HIERARCHY, hasRole, isRoleGreater } from "./permissions";

export const gzip = (str: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    zlib.gzip(str, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });

export const gunzip = (buf: zlib.InputType): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
