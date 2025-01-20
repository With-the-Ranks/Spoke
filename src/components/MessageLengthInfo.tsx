import React from "react";
import { useTranslation } from "react-i18next";

import { getSpokeCharCount } from "../lib/charset-utils";

interface MessageLengthProps {
  messageText: string;
}

const MessageLengthInfo: React.FC<MessageLengthProps> = ({ messageText }) => {
  const { t } = useTranslation();

  const { charCount, msgCount, charsPerSegment } = getSpokeCharCount(
    messageText
  );

  const segmentInfo = `(${msgCount} ${t("segment", { count: msgCount })})`;

  return (
    <div style={{ display: "inline" }}>
      {`${charCount}/${msgCount * charsPerSegment} ${segmentInfo}`}
    </div>
  );
};

export default MessageLengthInfo;
