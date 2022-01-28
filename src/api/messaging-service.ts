import { RelayEdge, RelayPaginatedResponse } from "./pagination";

export enum MessagingServiceType {
  TWILIO = "TWILIO",
  ASSEMBLE_NUMBERS = "ASSEMBLE_NUMBERS"
}

export interface MessagingService {
  id: string;
  messagingServiceSid: string;
  serviceType: MessagingServiceType;
  tcrBrandRegistrationLink: string | null;
  updatedAt: string;
}

export type MessagingServiceEdge = RelayEdge<MessagingService>;

export type MessagingServicePage = RelayPaginatedResponse<MessagingService>;

export const schema = `
  enum MessagingServiceType {
    TWILIO
    ASSEMBLE_NUMBERS
  }

  type MessagingService {
    id: ID!
    messagingServiceSid: String!
    serviceType: MessagingServiceType!
    updatedAt: String!
    tcrBrandRegistrationLink: String
  }

  type MessagingServiceEdge {
    cursor: Cursor!
    node: MessagingService!
  }

  type MessagingServicePage {
    edges: [MessagingServiceEdge!]!
    pageInfo: RelayPageInfo!
  }
`;

export default schema;