import { titleCase } from "./scripts";

describe("script utilities", () => {
  it("converts uppercase single word to title case", () => {
    expect(titleCase("SPOKE")).toEqual("Spoke");
  });
  it("converts lowercase single word to title case", () => {
    expect(titleCase("spoke")).toEqual("Spoke");
  });
  it("converts mixed-case single word to title case", () => {
    expect(titleCase("sPoKe")).toEqual("Spoke");
  });

  it("converts uppercase words to title case", () => {
    expect(titleCase("SPOKE")).toEqual("Spoke");
  });
  it("converts lowercase words to title case", () => {
    expect(titleCase("spoke")).toEqual("Spoke");
  });
  it("converts mixed-case words to title case", () => {
    expect(titleCase("sPoKe")).toEqual("Spoke");
  });
  it("ignores hyphens", () => {
    expect(titleCase("spoke-wtr")).toEqual("Spoke-wtr");
  });
});
