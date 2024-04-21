export const schema = `
  input CampaignVariableInput {
    displayOrder: Int!
    name: String!
    value: String
  }

  type CampaignVariable {
    id: ID!
    displayOrder: Int!
    name: String!
    value: String
  }
`;

export default schema;
