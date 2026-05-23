import { sqlResolvers } from "./lib/utils";

export const resolvers = {
  CampaignVariable: {
    ...sqlResolvers(["id", "displayOrder", "name", "value"])
  }
};

export default resolvers;
