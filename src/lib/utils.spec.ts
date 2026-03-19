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

  it("rejects a URL without a scheme", () => {
    expect(stringIsAValidUrl("www.politicsrewired.com")).toBe(false);
  });

  it("rejects a relative path", () => {
    expect(stringIsAValidUrl("foo/bar")).toBe(false);
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
});

describe("asPercent", () => {
  it("returns 0 when denominator is 0", () => {
    expect(asPercent(10, 0)).toBe(0);
  });

  it("returns 100 for equal numerator and denominator", () => {
    expect(asPercent(10, 10)).toBe(100);
  });
});

describe("asPercentWithTotal", () => {
  it("returns 0% with total when denominator is 0", () => {
    expect(asPercentWithTotal(10, 0)).toBe("0%(10)");
  });

  it("truncates to 4 characters of the percentage string", () => {
    expect(asPercentWithTotal(9, 11)).toBe("81.8%(9)");
  });
});
