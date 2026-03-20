import filter from "lodash/fp/filter";
import flow from "lodash/fp/flow";
import fromPairs from "lodash/fp/fromPairs";
import map from "lodash/fp/map";
import reverse from "lodash/fp/reverse";
import sortBy from "lodash/fp/sortBy";

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
  answer_option?: string;
}

interface GraphQLInteractionStep extends BaseInteractionStep {
  parentInteractionId: string | null;
  question?: {
    answerOptions?: Array<{
      value: string;
      nextInteractionStep?: { id: string } | null;
    }>;
  };
}

type InteractionStep = ModelInteractionStep | GraphQLInteractionStep;

interface InteractionStepWithLink extends BaseInteractionStep {
  answerLink: string | undefined;
  [key: string]: unknown;
}

export const sortByCreatedAt = (is: BaseInteractionStep): DateTime | null => {
  const asDate = DateTime.fromISO(is.createdAt);
  return asDate.isValid ? asDate : null;
};

// Sort by newest first
export const sortByNewest = flow(sortBy(sortByCreatedAt), reverse);

export const findParent = (
  interactionStep: InteractionStep,
  allInteractionSteps: InteractionStep[],
  isModel: boolean
): InteractionStepWithLink | null => {
  let parent: InteractionStepWithLink | null = null;
  allInteractionSteps.forEach((step) => {
    if (isModel) {
      const modelStep = step as ModelInteractionStep;
      const modelTarget = interactionStep as ModelInteractionStep;
      if (modelStep.id === modelTarget.parent_interaction_id) {
        parent = {
          ...modelStep,
          answerLink: modelTarget.answer_option
        };
      }
    } else if (
      (step as GraphQLInteractionStep).question &&
      (step as GraphQLInteractionStep).question?.answerOptions
    ) {
      (step as GraphQLInteractionStep).question!.answerOptions!.forEach(
        (answer) => {
          if (
            answer.nextInteractionStep &&
            answer.nextInteractionStep.id === interactionStep.id
          ) {
            parent = {
              ...step,
              answerLink: answer.value
            };
          }
        }
      );
    }
  });
  return parent;
};

export const getInteractionPath = (
  interactionStep: InteractionStep,
  allInteractionSteps: InteractionStep[],
  isModel: boolean
): InteractionStepWithLink[] => {
  const path: InteractionStepWithLink[] = [];
  let parent = findParent(interactionStep, allInteractionSteps, isModel);
  while (parent !== null) {
    path.unshift(parent);
    parent = findParent(
      parent,
      allInteractionSteps as InteractionStep[],
      isModel
    );
  }
  return path;
};

export const interactionStepForId = (
  id: string,
  interactionSteps: BaseInteractionStep[]
): BaseInteractionStep | null =>
  interactionSteps.find((step) => step.id === id) ?? null;

export const getChildren = (
  interactionStep: InteractionStep,
  allInteractionSteps: InteractionStep[],
  isModel: boolean
): InteractionStep[] => {
  const children: InteractionStep[] = [];
  allInteractionSteps.forEach((step) => {
    const path = getInteractionPath(step, allInteractionSteps, isModel);
    path.forEach((pathElement) => {
      if (pathElement.id === interactionStep.id) {
        children.push(step);
      }
    });
  });
  return children;
};

export const getInteractionTree = (
  allInteractionSteps: InteractionStep[],
  isModel: boolean
): Record<
  number,
  Array<{ interactionStep: InteractionStep; path: InteractionStepWithLink[] }>
> => {
  const pathLengthHash: Record<
    number,
    Array<{ interactionStep: InteractionStep; path: InteractionStepWithLink[] }>
  > = {};
  allInteractionSteps.forEach((step) => {
    const path = getInteractionPath(step, allInteractionSteps, isModel);
    pathLengthHash[path.length] = pathLengthHash[path.length] || [];
    pathLengthHash[path.length].push({ interactionStep: step, path });
  });
  return pathLengthHash;
};

export const getTopMostParent = (
  interactionSteps: InteractionStep[],
  isModel: boolean
): InteractionStep | undefined =>
  sortByNewest(interactionSteps).find((step: InteractionStep) =>
    isModel
      ? (step as ModelInteractionStep).parent_interaction_id === null
      : (step as GraphQLInteractionStep).parentInteractionId === null
  );

interface TreeNode extends BaseInteractionStep {
  interactionSteps: TreeNode[];
  [key: string]: unknown;
}

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

  const root = id
    ? indexedById[id]
    : getTopMostParent(interactionSteps as InteractionStep[], false);

  return {
    ...root,
    interactionSteps: flow(
      filter(
        (is: GraphQLInteractionStep) => is.parentInteractionId === root?.id
      ),
      sortByNewest,
      map((c: BaseInteractionStep) =>
        makeTree(interactionSteps, c.id, indexedById)
      )
    )(interactionSteps)
  };
};
