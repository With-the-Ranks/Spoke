import { getFormattedZip, zipToTimeZone } from "./zip-format";

describe("getFormattedZip", () => {
  it("formats a standard 5-digit zip", () => {
    expect(getFormattedZip("12345")).toBe("12345");
  });

  it("extracts the 5-digit portion from a zip+4", () => {
    expect(getFormattedZip("12345-3456")).toBe("12345");
  });

  it("extracts the 5-digit portion ignoring a malformed suffix", () => {
    expect(getFormattedZip("12345-abcd")).toBe("12345");
  });

  it("zero-pads a 4-digit zip (Excel stripping leading zero)", () => {
    expect(getFormattedZip("2345")).toBe("02345");
  });

  it("returns null for a non-numeric string that has no 5-digit match", () => {
    expect(getFormattedZip("abc")).toBeNull();
  });

  // These were bugs in the original code where the 4-digit regex matched
  // substrings. Now fixed: the 4-digit fallback only matches pure 4-digit input.
  it("returns null for input containing a 4-digit sequence with other chars", () => {
    expect(getFormattedZip("a2345-abcd")).toBeNull();
  });

  it("returns null for a 4-digit zip with a non-numeric suffix", () => {
    expect(getFormattedZip("2345-abcd")).toBeNull();
  });
});

describe("zipToTimeZone", () => {
  it("maps a zip with leading zeroes to the correct timezone range", () => {
    const result = zipToTimeZone("00100");
    expect(result).toBeDefined();
    expect(result![0]).toBeLessThanOrEqual(100); // firstZip <= 100
    expect(result![1]).toBeGreaterThan(100); // lastZip > 100
    expect(result![2]).toBe(-4); // UTC-4 offset
  });

  // Source code accepts numeric zips via parseInt despite the string signature
  it("accepts a numeric zip input", () => {
    const result = zipToTimeZone((100 as unknown) as string);
    expect(result).toBeDefined();
    expect(result![2]).toBe(-4);
  });

  it("returns undefined for a zip beyond the highest range", () => {
    expect(zipToTimeZone("99501")).toBeUndefined();
  });

  it("matches a zip at the lower boundary of a range", () => {
    const result = zipToTimeZone("59000");
    expect(result).toBeDefined();
    expect(result![2]).toBe(-7); // UTC-7
  });

  it("matches a zip one below the upper boundary of a range", () => {
    const result = zipToTimeZone("69020");
    expect(result).toBeDefined();
    expect(result![2]).toBe(-6); // UTC-6
  });

  it("returns undefined for a zip at the upper boundary (exclusive)", () => {
    expect(zipToTimeZone("69021")).toBeUndefined();
  });
});
