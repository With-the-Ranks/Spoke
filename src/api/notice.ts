import type { Notice, TitleContentNotice } from "@spoke/spoke-codegen";
import type { GraphQLType } from "graphql";

// eslint-disable-next-line import/prefer-default-export
export function isTitleContentNotice(obj: Notice): obj is TitleContentNotice {
  return (
    (obj as TitleContentNotice & GraphQLType).__typename ===
    "TitleContentNotice"
  );
}
