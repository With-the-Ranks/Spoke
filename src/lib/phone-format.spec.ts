import {
  extractPhoneNumber,
  getFormattedPhoneNumber,
  stripPhoneNumbers
} from "./phone-format";

describe("getFormattedPhoneNumber", () => {
  it("formats a valid 10-digit US number to E164", () => {
    expect(getFormattedPhoneNumber("2025551234")).toBe("+12025551234");
  });

  it("formats a number with dashes", () => {
    expect(getFormattedPhoneNumber("202-555-1234")).toBe("+12025551234");
  });

  it("formats a number with parentheses and spaces", () => {
    expect(getFormattedPhoneNumber("(202) 555-1234")).toBe("+12025551234");
  });

  it("formats a number already in E164 format", () => {
    expect(getFormattedPhoneNumber("+12025551234")).toBe("+12025551234");
  });

  it("formats a number with leading 1 (country code)", () => {
    expect(getFormattedPhoneNumber("12025551234")).toBe("+12025551234");
  });

  it("returns empty string for an invalid number", () => {
    expect(getFormattedPhoneNumber("123")).toBe("");
  });

  it("returns empty string for an empty string", () => {
    expect(getFormattedPhoneNumber("")).toBe("");
  });

  it("returns empty string for alphabetic input", () => {
    expect(getFormattedPhoneNumber("not-a-number")).toBe("");
  });
});

describe("extractPhoneNumber", () => {
  it("extracts a 10-digit number with dashes from text", () => {
    expect(extractPhoneNumber("Call 202-555-1234 now")).toBe(" 202-555-1234");
  });

  it("extracts a number with country code prefix", () => {
    const result = extractPhoneNumber("Call +1 202 555 1234 now");
    expect(result).not.toBeNull();
  });

  it("returns null when no phone number is found", () => {
    expect(extractPhoneNumber("Call 555-1234 now")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractPhoneNumber("")).toBeNull();
  });
});

describe("stripPhoneNumbers", () => {
  it("removes a phone number from a string", () => {
    expect(stripPhoneNumbers("Jane Doe 2025551234")).toBe("Jane Doe");
  });

  it("returns the original string when no phone number is present", () => {
    expect(stripPhoneNumbers("Jane Doe")).toBe("Jane Doe");
  });

  it("trims whitespace after removal", () => {
    expect(stripPhoneNumbers("2025551234 Jane")).toBe("Jane");
  });
});
