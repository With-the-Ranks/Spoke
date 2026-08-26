import { getSpokeCharCount } from "./charset-utils";

describe("getSpokeCharCount", () => {
  it("uses an available average and otherwise keeps the token estimate", () => {
    const text = "Hi {first_name}";
    expect(getSpokeCharCount(text, { first_name: 4 }).charCount).toBe(7);
    expect(getSpokeCharCount(text, { first_name: 0 }).charCount).toBe(17);
  });

  it("uses an available campaign variable and otherwise keeps the estimate", () => {
    const text = "Hi {cv:event}";
    expect(
      getSpokeCharCount(text, {}, [{ name: "cv:event", value: "party" }])
        .charCount
    ).toBe(8);
    expect(
      getSpokeCharCount(text, {}, [{ name: "cv:event", value: null }]).charCount
    ).toBe(15);
  });
});
