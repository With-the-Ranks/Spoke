import type { Notice, TitleContentNotice } from "@spoke/spoke-codegen";
import type { GraphQLType } from "graphql";

/* eslint-disable import/prefer-default-export */
export const isTitleContentNotice = (obj: Notice): obj is TitleContentNotice =>
  (obj as TitleContentNotice & GraphQLType).__typename === "TitleContentNotice";
