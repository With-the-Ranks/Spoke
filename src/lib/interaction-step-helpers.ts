import { DateTime } from "./datetime";

// Shared shape for interaction steps used by both model (server) and
// GraphQL (client) representations. The caller passes `isModel` to
// select which field names to use.
interface BaseInteractionStep {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

interface ModelInteractionStep extends BaseInteractionStep {
  parent_interaction_id: string | null;
}

interface GraphQLInteractionStep extends BaseInteractionStep {
  parentInteractionId: string | null;
}

type InteractionStep = ModelInteractionStep | GraphQLInteractionStep;

interface TreeNode extends BaseInteractionStep {
  interactionSteps: TreeNode[];
  [key: string]: unknown;
}

const sortByCreatedAt = (step: BaseInteractionStep): number => {
  const dt = DateTime.fromISO(step.createdAt);
  return dt.isValid ? dt.toMillis() : 0;
};

/** Sort interaction steps by createdAt, newest first. */
const sortByNewest = <T extends BaseInteractionStep>(steps: T[]): T[] =>
  [...steps].sort((a, b) => sortByCreatedAt(b) - sortByCreatedAt(a));

export const getTopMostParent = (
  interactionSteps: InteractionStep[],
  isModel: boolean
): InteractionStep | undefined =>
  sortByNewest(interactionSteps).find((step) =>
    isModel
      ? (step as ModelInteractionStep).parent_interaction_id === null
      : (step as GraphQLInteractionStep).parentInteractionId === null
  );

export const makeTree = (
  interactionSteps: BaseInteractionStep[],
  id: string | null = null,
  indexed: Record<string, BaseInteractionStep> | null = null
): TreeNode => {
  const indexedById =
    indexed || Object.fromEntries(interactionSteps.map((is) => [is.id, is]));

  const root = id
    ? indexedById[id]
    : getTopMostParent(interactionSteps as InteractionStep[], false);

  const children = interactionSteps.filter(
    (is) => (is as GraphQLInteractionStep).parentInteractionId === root?.id
  );

  return {
    ...root,
    interactionSteps: sortByNewest(children).map((c) =>
      makeTree(interactionSteps, c.id, indexedById)
    )
  };
};
