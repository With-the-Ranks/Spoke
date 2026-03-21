import {
  asPercent,
  asPercentWithTotal,
  replaceAll,
  stringIsAValidUrl
} from "./utils";

describe("stringIsAValidUrl", () => {
  it("accepts a valid https URL", () => {
    expect(stringIsAValidUrl("https://www.politicsrewired.com")).toBe(true);
  });

  it("accepts a valid URL with query parameters", () => {
    expect(
      stringIsAValidUrl("https://www.politicsrewired.com?foo=bar&bar=baz")
    ).toBe(true);
  });

  it("accepts an http URL", () => {
    expect(stringIsAValidUrl("http://example.com")).toBe(true);
  });

  it("rejects a URL without a scheme", () => {
    expect(stringIsAValidUrl("www.politicsrewired.com")).toBe(false);
  });

  it("rejects a relative path", () => {
    expect(stringIsAValidUrl("foo/bar")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(stringIsAValidUrl("")).toBe(false);
  });
});

describe("replaceAll", () => {
  it("replaces multiple occurrences of a substring", () => {
    expect(
      replaceAll("buffalo buffalo buffalo buffalo buffalo", "buffalo", "squid")
    ).toBe("squid squid squid squid squid");
  });

  it("escapes special regex characters in the search string", () => {
    expect(replaceAll(`what about \\ characters?`, `\\`, `?`)).toBe(
      "what about ? characters?"
    );
  });

  it("returns the original string when search is not found", () => {
    expect(replaceAll("hello world", "xyz", "abc")).toBe("hello world");
  });
});

describe("asPercent", () => {
  it("returns 0 when denominator is 0", () => {
    expect(asPercent(10, 0)).toBe(0);
  });

  it("returns 100 for equal numerator and denominator", () => {
    expect(asPercent(10, 10)).toBe(100);
  });

  it("returns a fractional percentage", () => {
    expect(asPercent(1, 3)).toBeCloseTo(33.33, 1);
  });

  it("returns 50 for half", () => {
    expect(asPercent(5, 10)).toBe(50);
  });
});

describe("asPercentWithTotal", () => {
  it("returns 0% with total when denominator is 0", () => {
    expect(asPercentWithTotal(10, 0)).toBe("0%(10)");
  });

  it("truncates decimal to 4 characters", () => {
    expect(asPercentWithTotal(9, 11)).toBe("81.8%(9)");
  });

  it("handles 100% correctly", () => {
    expect(asPercentWithTotal(10, 10)).toBe("100%(10)");
  });
});
