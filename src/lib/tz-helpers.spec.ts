import { DateTime } from "./datetime";
import { asUtc, getSendBeforeUtc, isValidTimezone } from "./tz-helpers";

describe("isValidTimezone", () => {
  it("returns true for a valid IANA timezone", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it("returns true for UTC", () => {
    expect(isValidTimezone("utc")).toBe(true);
  });

  it("returns false for a nonsense string", () => {
    expect(isValidTimezone("Not/A/Timezone")).toBe(false);
  });

  it("returns true for deprecated US timezone names (via DateTime wrapper)", () => {
    expect(isValidTimezone("US/Eastern")).toBe(true);
  });
});

describe("asUtc", () => {
  it("converts a JS Date to a DateTime in UTC", () => {
    const jsDate = new Date("2020-06-15T12:00:00Z");
    const result = asUtc(jsDate);
    expect(result.zoneName).toBe("UTC");
    expect(result.year).toBe(2020);
    expect(result.month).toBe(6);
    expect(result.day).toBe(15);
    expect(result.hour).toBe(12);
  });
});

describe("getSendBeforeUtc", () => {
  it("returns end-of-day UTC for a midday local time", () => {
    const middayEastern = DateTime.fromISO("2020-01-20T12:00:00-05:00");
    expect(getSendBeforeUtc("America/New_York", 21, middayEastern)).toBe(
      "2020-01-21T02:00:00.000Z"
    );
  });

  it("returns next-day end hour when current time is after end hour", () => {
    const afterHoursEastern = DateTime.fromISO("2020-01-20T22:00:00-05:00");
    expect(getSendBeforeUtc("America/New_York", 21, afterHoursEastern)).toBe(
      "2020-01-21T02:00:00.000Z"
    );
  });

  it("handles UTC input time correctly", () => {
    const afterHoursUtc = DateTime.fromISO("2020-01-21T03:00:00Z");
    expect(getSendBeforeUtc("America/New_York", 21, afterHoursUtc)).toBe(
      "2020-01-21T02:00:00.000Z"
    );
  });
});
