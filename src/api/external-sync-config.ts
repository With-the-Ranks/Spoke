import type {
  ExternalActivistCodeTarget,
  ExternalResultCodeTarget,
  ExternalSurveyQuestionResponseOptionTarget,
  ExternalSyncConfigTarget
} from "@spoke/spoke-codegen";
import type { GraphQLType } from "graphql";

export const isActivistCode = (
  obj: ExternalSyncConfigTarget
): obj is ExternalActivistCodeTarget =>
  (obj as ExternalActivistCodeTarget & GraphQLType).__typename ===
  "ExternalActivistCodeTarget";

export const isResponseOption = (
  obj: ExternalSyncConfigTarget
): obj is ExternalSurveyQuestionResponseOptionTarget =>
  (obj as ExternalSurveyQuestionResponseOptionTarget & GraphQLType)
    .__typename === "ExternalSurveyQuestionResponseOptionTarget";

export const isResultCode = (
  obj: ExternalSyncConfigTarget
): obj is ExternalResultCodeTarget =>
  (obj as ExternalResultCodeTarget & GraphQLType).__typename ===
  "ExternalResultCodeTarget";
