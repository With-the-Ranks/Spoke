import React from "react";

import { LinkInNewTab } from "./LinkInNewTab";

export interface IncludeImageDocLinkProps {
  text: string;
}

const IMAGE_DOC_LINK =
  "https://withtheranks.com/docs/spoke/for-spoke-admins/include-an-image-in-a-message";

export const IncludeImageDocLink: React.FC<IncludeImageDocLinkProps> = ({
  text
}) => <LinkInNewTab link={IMAGE_DOC_LINK} text={text} />;
