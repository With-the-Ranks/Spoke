import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberRegex = /(?:[-+() ]*\d){10,13}/g;
const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Extract the first phone number from a string, or return null if none found.
 * Encapsulates the phone number regex so callers don't need to manage
 * the global regex's lastIndex state.
 */
export const extractPhoneNumber = (str: string): string | null => {
  // Reset lastIndex since the regex has the global flag
  phoneNumberRegex.lastIndex = 0;
  const match = str.match(phoneNumberRegex);
  return match ? match[0] : null;
};

/**
 * Remove all phone numbers from a string.
 */
export const stripPhoneNumbers = (str: string): string => {
  phoneNumberRegex.lastIndex = 0;
  return str.replace(phoneNumberRegex, "").trim();
};

/**
 * Parse and format a phone number to E164 format (+12025551234).
 * Returns empty string for invalid numbers — the cell column in the database
 * is NOT NULL, so null would cause insert failures. Invalid numbers are
 * filtered out downstream by NANP regex before assignment creation.
 */
export const getFormattedPhoneNumber = (
  cell: string,
  country = "US"
): string => {
  try {
    const inputNumber = phoneUtil.parse(cell, country);
    if (phoneUtil.isValidNumber(inputNumber)) {
      return phoneUtil.format(inputNumber, PhoneNumberFormat.E164);
    }
    return "";
  } catch (err) {
    return "";
  }
};
