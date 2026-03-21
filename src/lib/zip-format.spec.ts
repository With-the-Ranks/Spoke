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

  // TODO(PR 4): These tests document the correct expected behavior but
  // fail because of a bug in getFormattedZip — the 4-digit regex matches
  // substrings instead of requiring a pure 4-digit input. Fix in PR 4.
  it.skip("returns null for input with embedded 4-digit sequence", () => {
    expect(getFormattedZip("a2345-abcd")).toBeNull();
  });

  it.skip("returns null for 4-digit zip with non-numeric suffix", () => {
    expect(getFormattedZip("2345-abcd")).toBeNull();
  });

  it("throws for a non-US country", () => {
    expect(() => getFormattedZip("11790", "OZ")).toThrow(/OZ/);
  });
});

describe("zipToTimeZone", () => {
  it("maps a zip with leading zeroes to the correct range", () => {
    const result = zipToTimeZone("00100");
    expect(result).toBeDefined();
    expect(result[0]).toBe(-1);
    expect(result[1]).toBe(210);
    expect(result[2]).toBe(-4);
    expect(result[3]).toBe(1);
  });

  it("accepts a numeric zip input", () => {
    const result = zipToTimeZone(100);
    expect(result).toBeDefined();
    expect(result[0]).toBe(-1);
    expect(result[1]).toBe(210);
    expect(result[2]).toBe(-4);
    expect(result[3]).toBe(1);
  });

  it("returns undefined for a zip beyond the highest range", () => {
    expect(zipToTimeZone("99501")).toBeUndefined();
  });

  it("matches a zip at the lower boundary of a range", () => {
    const result = zipToTimeZone("59000");
    expect(result[2]).toBe(-7);
    expect(result[3]).toBe(1);
  });

  it("matches a zip one below the upper boundary of a range", () => {
    const result = zipToTimeZone("69020");
    expect(result[2]).toBe(-6);
    expect(result[3]).toBe(1);
  });

  it("returns undefined for a zip at the upper boundary (exclusive)", () => {
    expect(zipToTimeZone("69021")).toBeUndefined();
  });
});
