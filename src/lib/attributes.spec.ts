import {
  camelCase,
  nameComponents,
  recordToCamelCase,
  snakeToTitleCase,
  titleCase
} from "./attributes";

describe("camelCase", () => {
  it("converts a space-separated string", () => {
    expect(camelCase("hello world")).toBe("helloWorld");
  });

  it("converts a multi-word string", () => {
    expect(camelCase("the quick brown fox")).toBe("theQuickBrownFox");
  });

  it("handles a single word", () => {
    expect(camelCase("hello")).toBe("hello");
  });

  it("handles an already camelCase string", () => {
    expect(camelCase("helloWorld")).toBe("helloWorld");
  });
});

describe("titleCase", () => {
  it("capitalizes the first letter and lowercases the rest", () => {
    expect(titleCase("hello")).toBe("Hello");
  });

  it("converts an all-uppercase word", () => {
    expect(titleCase("HELLO")).toBe("Hello");
  });

  // Note: this is a single-word titleCase, unlike scripts.ts titleCase
  // which handles multiple words. Only the first character is capitalized.
  it("only capitalizes the first character of multi-word input", () => {
    expect(titleCase("hello world")).toBe("Hello world");
  });
});

describe("snakeToTitleCase", () => {
  it("converts snake_case to Title Case with spaces", () => {
    expect(snakeToTitleCase("hello_world")).toBe("Hello World");
  });

  it("converts a single word", () => {
    expect(snakeToTitleCase("hello")).toBe("Hello");
  });

  it("handles multiple underscores", () => {
    expect(snakeToTitleCase("one_two_three")).toBe("One Two Three");
  });
});

describe("nameComponents", () => {
  it("splits a two-word name into first and last", () => {
    const result = nameComponents("Jane Doe");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.cellNumber).toBeUndefined();
  });

  it("treats a single word as firstName only", () => {
    const result = nameComponents("Jane");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBeUndefined();
    expect(result.cellNumber).toBeUndefined();
  });

  it("puts everything after the first word into lastName", () => {
    const result = nameComponents("Jane van der Berg");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("van der Berg");
  });

  it("extracts a phone number from the name string", () => {
    const result = nameComponents("Jane Doe 2025551234");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.cellNumber).toBe("+12025551234");
  });

  it("returns undefined fields for an empty string", () => {
    const result = nameComponents("");
    expect(result.firstName).toBeUndefined();
    expect(result.lastName).toBeUndefined();
    expect(result.cellNumber).toBeUndefined();
  });
});

describe("recordToCamelCase", () => {
  it("converts snake_case keys to camelCase", () => {
    const result = recordToCamelCase({
      first_name: "Jane",
      last_name: "Doe"
    });
    expect(result).toEqual({ firstName: "Jane", lastName: "Doe" });
  });

  it("preserves already camelCase keys", () => {
    const result = recordToCamelCase({ firstName: "Jane" });
    expect(result).toEqual({ firstName: "Jane" });
  });

  it("does not modify values", () => {
    const result = recordToCamelCase({ some_key: "some_value" });
    expect(result).toEqual({ someKey: "some_value" });
  });
});
