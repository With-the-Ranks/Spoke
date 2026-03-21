import { DateTime } from "./datetime";
import { getSendBeforeUtc } from "./tz-helpers";

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
