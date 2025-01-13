import React from "react";

import { getSpokeCharCount } from "../lib/charset-utils";

interface MessageLengthProps {
  messageText: string;
}

const MessageLengthInfo: React.FC<MessageLengthProps> = ({ messageText }) => {
  const { charCount, msgCount, charsPerSegment } = getSpokeCharCount(
    messageText
  );
  const segmentInfo = msgCount === 1 ? "(1 segment)" : `(${msgCount} segments)`;

  return (
    <div style={{ display: "inline" }}>
      {`${charCount}/${msgCount * charsPerSegment} ${segmentInfo}`}
    </div>
  );
};

export default MessageLengthInfo;
