import type { InteractionStep } from "../api/interaction-step";
import {
  getTopMostParent,
  interactionStepForId,
  makeTree
} from "./interaction-step-helpers";

const baseEmptyStep: Omit<InteractionStep, "id" | "parentInteractionId"> = {
  questionText: "",
  answerActions: "",
  scriptOptions: [""],
  isDeleted: false,
  answerOption: "",
  createdAt: "2021-01-26T00:00:00Z"
};

const step = (
  id: string,
  parentInteractionId: string | null,
  overrides: Partial<InteractionStep> = {}
): InteractionStep => ({
  ...baseEmptyStep,
  id,
  parentInteractionId,
  createdAt: `2021-01-26T00:00:0${id}Z`,
  ...overrides
});

describe("interactionStepForId", () => {
  it("returns the step matching the given id", () => {
    const steps = [step("1", null), step("2", "1"), step("3", "1")];
    expect(interactionStepForId("2", steps)).toEqual(steps[1]);
  });

  it("returns null when no step matches", () => {
    const steps = [step("1", null)];
    expect(interactionStepForId("999", steps)).toBeNull();
  });

  // Documents known behavior: uses forEach instead of find, so returns
  // the *last* match if there are duplicates.
  it("returns the last match when duplicate ids exist", () => {
    const first = step("1", null, { questionText: "first" });
    const duplicate = step("1", null, { questionText: "duplicate" });
    expect(interactionStepForId("1", [first, duplicate])).toEqual(duplicate);
  });
});

describe("getTopMostParent", () => {
  it("returns the root step (parentInteractionId === null)", () => {
    const root = step("1", null);
    const child = step("2", "1");
    expect(getTopMostParent([root, child], false)).toEqual(root);
  });

  it("returns the newest root when multiple roots exist", () => {
    const olderRoot = step("1", null);
    const newerRoot = step("2", null);
    expect(getTopMostParent([olderRoot, newerRoot], false)).toEqual(newerRoot);
  });

  it("returns undefined for an empty array", () => {
    expect(getTopMostParent([], false)).toBeUndefined();
  });
});

describe("makeTree", () => {
  it("returns a wrapper with empty children for an empty input", () => {
    const tree = makeTree([]);
    expect(tree).toEqual({ interactionSteps: [] });
  });

  it("builds a tree with nested children", () => {
    const root = step("1", null);
    const childA = step("2", "1");
    const childB = step("3", "1");
    const grandchild = step("4", "2");

    const tree = makeTree([root, childA, childB, grandchild]);

    expect(tree).toEqual({
      ...root,
      interactionSteps: [
        { ...childB, interactionSteps: [] },
        {
          ...childA,
          interactionSteps: [{ ...grandchild, interactionSteps: [] }]
        }
      ]
    });
  });

  it("includes deleted steps in the tree", () => {
    const root = step("1", null);
    const childA = step("2", "1");
    const deletedChild = step("3", "1", { isDeleted: true });
    const grandchild = step("4", "2");

    const tree = makeTree([root, childA, deletedChild, grandchild]);

    expect(tree).toEqual({
      ...root,
      interactionSteps: [
        { ...deletedChild, interactionSteps: [] },
        {
          ...childA,
          interactionSteps: [{ ...grandchild, interactionSteps: [] }]
        }
      ]
    });
  });

  it("sorts children by createdAt (newest first)", () => {
    const root = step("1", null);
    const childA = step("2", "1");
    const childB = step("3", "1");
    const childC = step("4", "1");

    const tree = makeTree([root, childA, childC, childB]);

    expect(tree).toEqual({
      ...root,
      interactionSteps: [
        { ...childC, interactionSteps: [] },
        { ...childB, interactionSteps: [] },
        { ...childA, interactionSteps: [] }
      ]
    });
  });

  it("uses the newest root when multiple roots exist", () => {
    const rootA = step("1", null);
    const childAA = step("2", "1");
    const rootB = step("3", null);
    const childBA = step("4", "3");

    const tree = makeTree([rootA, childAA, rootB, childBA]);

    expect(tree).toEqual({
      ...rootB,
      interactionSteps: [{ ...childBA, interactionSteps: [] }]
    });
  });
});
