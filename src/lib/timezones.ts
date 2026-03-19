import { DateTime, Interval } from "./datetime";

export const timezones: readonly string[] = [
  "US/Alaska",
  "US/Aleutian",
  "US/Arizona",
  "US/Central",
  "US/East-Indiana",
  "US/Eastern",
  "US/Hawaii",
  "US/Indiana-Starke",
  "US/Michigan",
  "US/Mountain",
  "US/Pacific",
  "US/Samoa",
  "America/Puerto_Rico",
  "America/Virgin"
];

/**
 * Returns true if it is currently between the start and end hours in the specified timezone.
 *
 * @param timezone The timezone in which to evaluate
 * @param starthour Interval starting hour in 24-hour format
 * @param endHour Interval ending hour in 24-hour format
 */
export const isNowBetween = (
  timezone: string,
  starthour: number,
  endHour: number
): boolean => {
  const campaignTime = DateTime.local().setZone(timezone).startOf("day");

  return Interval.fromDateTimes(
    campaignTime.set({ hour: starthour }),
    campaignTime.set({ hour: endHour })
  ).contains(DateTime.local());
};

interface ContactWithTimezone {
  timezone?: string | null;
}

interface CampaignWithHours {
  timezone: string;
  textingHoursStart: number;
  textingHoursEnd: number;
}

/**
 * Return true if, in the contact's timezone, it is currently within the campaign texting hours.
 *
 * @param contact GraphQL-type contact
 * @param campaign GraphQL-type campaign type
 */
export const isContactNowWithinCampaignHours = (
  contact: ContactWithTimezone,
  campaign: CampaignWithHours
): boolean => {
  const timezone = contact.timezone || campaign.timezone;
  const { textingHoursStart, textingHoursEnd } = campaign;

  return isNowBetween(timezone, textingHoursStart, textingHoursEnd);
};
