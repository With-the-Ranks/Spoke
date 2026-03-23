import filter from "lodash/fp/filter";
import flow from "lodash/fp/flow";
import fromPairs from "lodash/fp/fromPairs";
import map from "lodash/fp/map";
import reverse from "lodash/fp/reverse";
import sortBy from "lodash/fp/sortBy";

import { DateTime } from "./datetime";

interface BaseInteractionStep {
  id: string;
  createdAt: string;
  parentInteractionId?: string | null;
  [key: string]: unknown;
}

interface TreeNode extends BaseInteractionStep {
  interactionSteps: TreeNode[];
}

export const sortByCreatedAt = (is: BaseInteractionStep): DateTime | null => {
  const asDate = DateTime.fromISO(is.createdAt);
  return asDate.isValid ? asDate : null;
};

// Sort by newest first
export const sortByNewest = flow(sortBy(sortByCreatedAt), reverse);

export const getTopMostParent = (
  interactionSteps: BaseInteractionStep[]
): BaseInteractionStep | undefined =>
  sortByNewest(interactionSteps).find(
    (step: BaseInteractionStep) => step.parentInteractionId === null
  );

export const makeTree = (
  interactionSteps: BaseInteractionStep[],
  id: string | null = null,
  indexed: Record<string, BaseInteractionStep> | null = null
): TreeNode => {
  const indexedById =
    indexed ||
    flow(
      map((is: BaseInteractionStep) => [is.id, is]),
      fromPairs
    )(interactionSteps);

  const root = id ? indexedById[id] : getTopMostParent(interactionSteps);

  return {
    ...root,
    interactionSteps: flow(
      filter((is: BaseInteractionStep) => is.parentInteractionId === root?.id),
      sortByNewest,
      map((c: BaseInteractionStep) =>
        makeTree(interactionSteps, c.id, indexedById)
      )
    )(interactionSteps)
  };
};
