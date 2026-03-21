import { DateTime, deprecatedTimezoneMap, parseIanaZone } from "./datetime";

describe("parseIanaZone", () => {
  it("converts a deprecated US timezone to its IANA equivalent", () => {
    expect(parseIanaZone("US/Eastern")).toBe("America/New_York");
  });

  it("is case-insensitive", () => {
    expect(parseIanaZone("us/eastern")).toBe("America/New_York");
    expect(parseIanaZone("US/EASTERN")).toBe("America/New_York");
  });

  it("passes through an already-IANA timezone unchanged", () => {
    expect(parseIanaZone("America/New_York")).toBe("America/New_York");
  });

  it("passes through an unknown timezone unchanged", () => {
    expect(parseIanaZone("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("returns empty string for empty string input", () => {
    expect(parseIanaZone("")).toBe("");
  });
});

describe("deprecatedTimezoneMap", () => {
  it("contains all expected US timezone mappings", () => {
    expect(Object.keys(deprecatedTimezoneMap)).toHaveLength(12);
    expect(deprecatedTimezoneMap["us/eastern"]).toBe("America/New_York");
    expect(deprecatedTimezoneMap["us/pacific"]).toBe("America/Los_Angeles");
    expect(deprecatedTimezoneMap["us/central"]).toBe("America/Chicago");
    expect(deprecatedTimezoneMap["us/mountain"]).toBe("America/Denver");
    expect(deprecatedTimezoneMap["us/hawaii"]).toBe("Pacific/Honolulu");
  });
});

describe("DateTime", () => {
  it("extends luxon DateTime", () => {
    const dt = DateTime.fromISO("2020-01-01T12:00:00Z");
    expect(dt.isValid).toBe(true);
    expect(dt.year).toBe(2020);
  });

  describe("setZone", () => {
    it("resolves a deprecated timezone name without invalidating", () => {
      const dt = DateTime.fromISO("2020-01-01T12:00:00Z");
      const rezoned = dt.setZone("US/Eastern");
      expect(rezoned.isValid).toBe(true);
      // The offset matches America/New_York (-5 in January)
      expect(rezoned.offset).toBe(-300);
    });

    it("works with standard IANA timezone names", () => {
      const dt = DateTime.fromISO("2020-01-01T12:00:00Z");
      const rezoned = dt.setZone("America/Chicago");
      expect(rezoned.isValid).toBe(true);
      expect(rezoned.zoneName).toBe("America/Chicago");
    });

    it("works with UTC", () => {
      const dt = DateTime.fromISO("2020-01-01T12:00:00-05:00");
      const rezoned = dt.setZone("utc");
      expect(rezoned.hour).toBe(17);
    });
  });
});
