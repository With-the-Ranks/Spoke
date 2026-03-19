import MockDate from "mockdate";
import { DateFunctions, DateTime, zone } from "timezonecomplete";

import { DstHelper } from "./dst-helper";

afterEach(() => {
  MockDate.reset();
});

describe("DstHelper", () => {
  describe("DST detection in Northern Hemisphere (America/New_York)", () => {
    it("reports no DST in February", () => {
      MockDate.set("2018-02-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("America/New_York")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "America/New_York")).toBe(
        false
      );
      expect(DstHelper.isDateTimeDst(dt, "America/New_York")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "America/New_York")).toBe(false);
    });

    it("reports DST in July", () => {
      MockDate.set("2018-07-21T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("America/New_York")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "America/New_York")).toBe(true);
      expect(DstHelper.isDateTimeDst(dt, "America/New_York")).toBe(true);
      expect(DstHelper.isDateDst(new Date(), "America/New_York")).toBe(true);
    });
  });

  describe("DST detection in Southern Hemisphere (Australia/Sydney)", () => {
    it("reports DST in February (southern summer)", () => {
      MockDate.set("2018-02-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("Australia/Sydney")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "Australia/Sydney")).toBe(true);
      expect(DstHelper.isDateTimeDst(dt, "Australia/Sydney")).toBe(true);
      expect(DstHelper.isDateDst(new Date(), "Australia/Sydney")).toBe(true);
    });

    it("reports no DST in July (southern winter)", () => {
      MockDate.set("2018-07-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("Australia/Sydney")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "Australia/Sydney")).toBe(
        false
      );
      expect(DstHelper.isDateTimeDst(dt, "Australia/Sydney")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "Australia/Sydney")).toBe(false);
    });
  });

  describe("timezones without DST", () => {
    it("reports no DST in Kathmandu in February", () => {
      MockDate.set("2018-02-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("Asia/Kathmandu")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "Asia/Kathmandu")).toBe(false);
      expect(DstHelper.isDateTimeDst(dt, "Asia/Kathmandu")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "Asia/Kathmandu")).toBe(false);
    });

    it("reports no DST in Kathmandu in July", () => {
      MockDate.set("2018-07-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("Asia/Kathmandu")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "Asia/Kathmandu")).toBe(false);
      expect(DstHelper.isDateTimeDst(dt, "Asia/Kathmandu")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "Asia/Kathmandu")).toBe(false);
    });

    it("reports no DST in Arizona in February", () => {
      MockDate.set("2018-02-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("US/Arizona")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "US/Arizona")).toBe(false);
      expect(DstHelper.isDateTimeDst(dt, "US/Arizona")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "US/Arizona")).toBe(false);
    });

    it("reports no DST in Arizona in July", () => {
      MockDate.set("2018-07-01T15:00:00Z");
      const dt = new DateTime(
        new Date(),
        DateFunctions.Get,
        zone("US/Arizona")
      );
      expect(DstHelper.isOffsetDst(dt.offset(), "US/Arizona")).toBe(false);
      expect(DstHelper.isDateTimeDst(dt, "US/Arizona")).toBe(false);
      expect(DstHelper.isDateDst(new Date(), "US/Arizona")).toBe(false);
    });
  });

  describe("getTimezoneOffsetHours and timezoneHasDst", () => {
    it("returns correct offset and DST flag for America/New_York", () => {
      expect(DstHelper.getTimezoneOffsetHours("America/New_York")).toBe(-5);
      expect(DstHelper.timezoneHasDst("America/New_York")).toBe(true);
    });

    it("returns correct offset and no DST for US/Arizona", () => {
      expect(DstHelper.getTimezoneOffsetHours("US/Arizona")).toBe(-7);
      expect(DstHelper.timezoneHasDst("US/Arizona")).toBe(false);
    });

    it("returns correct offset and DST flag for Europe/Paris", () => {
      expect(DstHelper.getTimezoneOffsetHours("Europe/Paris")).toBe(1);
      expect(DstHelper.timezoneHasDst("Europe/Paris")).toBe(true);
    });

    it("returns correct offset and DST flag for Europe/London", () => {
      expect(DstHelper.getTimezoneOffsetHours("Europe/London")).toBe(0);
      expect(DstHelper.timezoneHasDst("Europe/London")).toBe(true);
    });
  });
});
