import { titleCase } from "./scripts";

describe("titleCase", () => {
  it("converts an uppercase word", () => {
    expect(titleCase("SPOKE")).toBe("Spoke");
  });

  it("converts a lowercase word", () => {
    expect(titleCase("spoke")).toBe("Spoke");
  });

  it("converts a mixed-case word", () => {
    expect(titleCase("sPoKe")).toBe("Spoke");
  });

  it("converts multiple uppercase words", () => {
    expect(titleCase("SPOKE REWIRED")).toBe("Spoke Rewired");
  });

  it("converts multiple lowercase words", () => {
    expect(titleCase("spoke rewired")).toBe("Spoke Rewired");
  });

  it("converts multiple mixed-case words", () => {
    expect(titleCase("sPoKe ReWirEd")).toBe("Spoke Rewired");
  });

  it("does not split on hyphens", () => {
    expect(titleCase("spoke-rewired")).toBe("Spoke-rewired");
  });
});
