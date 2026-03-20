import humps from "humps";

import {
  extractPhoneNumber,
  getFormattedPhoneNumber,
  stripPhoneNumbers
} from "./phone-format";

interface DataTestAttribute {
  "data-test"?: string;
}

interface NameComponents {
  firstName: string | undefined;
  lastName: string | undefined;
  cellNumber: string | undefined;
}

// TODO: Remove once E2E tests are overhauled — they are not running in CI currently
// Used to generate data-test attributes on non-production environments and used by end-to-end tests
export const dataTest = (
  value: string,
  disable: boolean
): DataTestAttribute => {
  const attribute =
    window.NODE_ENV !== "production" && !disable ? { "data-test": value } : {};
  return attribute;
};

export const titleCase = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.substring(1).toLowerCase()}`;

export const snakeToTitleCase = (value: string): string =>
  value
    .split("_")
    .map((s) => titleCase(s))
    .join(" ");

export const nameComponents = (name: string): NameComponents => {
  let firstName;
  let lastName;
  let cellNumber;

  const unformattedNumber = extractPhoneNumber(name);

  if (unformattedNumber) {
    cellNumber = getFormattedPhoneNumber(unformattedNumber);
  }

  name = stripPhoneNumbers(name);

  if (!name) return { firstName, lastName, cellNumber };

  const splitName = name.split(" ");
  if (splitName.length === 1) {
    [firstName] = splitName;
  } else if (splitName.length === 2) {
    [firstName, lastName] = splitName;
  } else {
    [firstName] = splitName;
    lastName = splitName.slice(1, splitName.length + 1).join(" ");
  }

  return { firstName, lastName, cellNumber };
};

export const recordToCamelCase = <T = Record<string, unknown>>(
  record: Record<string, unknown>
): T =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [humps.camelize(key), value])
  ) as T;
