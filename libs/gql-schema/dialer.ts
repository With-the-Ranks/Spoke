export const schema = `
  type DialerCampaignContact {
    id: ID!
    campaignId: ID!
    firstName: String!
    lastName: String!
    zip: String
    callStatus: String!
    doNotCall: Boolean!
    attemptCount: Int!
    lastAttemptedAt: Date
    customFields: JSON!
    assignment: Assignment
    interactionSteps: [InteractionStep!]!
    questionResponseValues: [DialerQuestionResponseValue!]!
    tags: [Tag!]!
  }

  type DialerQuestionResponseValue {
    id: ID!
    interactionStepId: ID!
    question: String!
    value: String!
  }

  type DialerCall {
    id: ID!
    dialerCampaignContactId: ID!
    status: String!
    fromNumber: String
    telnyxCallControlId: String
    createdAt: Date!
    answeredAt: Date
    endedAt: Date
  }

  type InitiateCallResult {
    dialerCallId: ID!
    contactPhone: String!
    fromNumber: String!
  }

  type RequestCallShiftResult {
    assignmentId: ID
    campaignId: ID
    count: Int!
  }

  input DialerQuestionResponseInput {
    interactionStepId: String!
    value: String!
  }
`;

export default schema;
