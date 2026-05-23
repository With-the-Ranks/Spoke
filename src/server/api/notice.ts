/* eslint-disable import/prefer-default-export */
import type { Notice } from "@spoke/spoke-codegen";

import { isTitleContentNotice } from "../../api/notice";

// explicitly setting typename
export const resolvers = {
  Notice: {
    __resolveType: (obj: Notice) => {
      if (isTitleContentNotice(obj)) return "TitleContentNotice";
      return null;
    }
  }
};
