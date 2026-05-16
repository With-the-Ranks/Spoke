import { MessagingServiceType as GraphQLMessagingServiceType } from "../../api/messaging-service";
import { sqlResolvers } from "./lib/utils";
import type { MessagingServiceRecord } from "./types";
import { MessagingServiceType } from "./types";

export const resolvers = {
  MessagingService: {
    id: (service: MessagingServiceRecord) => service.messaging_service_sid,
    ...sqlResolvers([
      "messagingServiceSid",
      "name",
      "active",
      "updatedAt",
      "isDefault"
    ]),
    serviceType: (service: MessagingServiceRecord) =>
      service.service_type === MessagingServiceType.AssembleNumbers
        ? GraphQLMessagingServiceType.ASSEMBLE_NUMBERS
        : GraphQLMessagingServiceType.TWILIO
  }
};

export default resolvers;
