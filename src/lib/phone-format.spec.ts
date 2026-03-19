import {
  getDisplayPhoneNumber,
  getFormattedPhoneNumber,
  phoneNumberRegex
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

describe("getDisplayPhoneNumber", () => {
  it("formats E164 to national display format", () => {
    expect(getDisplayPhoneNumber("+12025551234")).toBe("(202) 555-1234");
  });
});

describe("phoneNumberRegex", () => {
  it("matches a 10-digit number with dashes", () => {
    // Reset lastIndex since the regex has the global flag
    phoneNumberRegex.lastIndex = 0;
    const match = "Call 202-555-1234 now".match(phoneNumberRegex);
    expect(match).not.toBeNull();
    expect(match![0].trim()).toBe("202-555-1234");
  });

  it("matches a number with country code prefix", () => {
    phoneNumberRegex.lastIndex = 0;
    const match = "Call +1 202 555 1234 now".match(phoneNumberRegex);
    expect(match).not.toBeNull();
  });

  it("does not match a short number", () => {
    phoneNumberRegex.lastIndex = 0;
    const match = "Call 555-1234 now".match(phoneNumberRegex);
    expect(match).toBeNull();
  });
});
