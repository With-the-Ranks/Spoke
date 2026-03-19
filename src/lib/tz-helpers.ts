import { DateTime } from "./datetime";

export const isValidTimezone = (tzstr: string): boolean =>
  DateTime.local().setZone(tzstr).invalidReason !== "unsupported zone";

export const asUtc = (dt: Date): DateTime =>
  DateTime.fromJSDate(dt, { zone: "utc" });

export const getSendBeforeUtc = (
  zone: string,
  endHour: number,
  now?: DateTime
): string | null =>
  (now ?? DateTime.local())
    .setZone(zone)
    .startOf("day")
    .set({ hour: endHour })
    .setZone("utc")
    .toISO();
