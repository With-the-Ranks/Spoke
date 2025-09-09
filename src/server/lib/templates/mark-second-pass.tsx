import React from "react";
import ReactDOMServer from "react-dom/server";

import { config } from "../../../config";

export interface MarkSecondPassProps {
  campaignId: number;
  organizationId: number;
  campaignTitle: string;
  unmark?: boolean;
}

const MarkSecondPass: React.FC<MarkSecondPassProps> = ({
  campaignId,
  campaignTitle,
  organizationId,
  unmark
}) => {
  const titleLink = (
    <a
      href={`${config.BASE_URL}/admin/${organizationId}/campaigns/${campaignId}`}
    >
      {campaignTitle}
    </a>
  );
  return (
    <>
      <p>
        Your second pass {unmark ? "un" : ""}marking for {titleLink} is
        complete! Navigate back to the campaign here: {titleLink}
      </p>
      <p>-- The Spoke Rewired Team</p>
    </>
  );
};

export const getContent = async (props: MarkSecondPassProps) => {
  const template = <MarkSecondPass {...props} />;
  return ReactDOMServer.renderToStaticMarkup(template);
};
