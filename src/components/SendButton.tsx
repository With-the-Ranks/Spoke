import { useTheme } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import { dataTest, titleCase } from "../lib/attributes";
import { useSpokeTheme } from "../styles/spoke-theme-context";

interface Props {
  threeClickEnabled?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  onFinalTouchTap: () => void | Promise<void>;
}

const SendButton: React.FC<Props> = (props) => {
  const theme = useTheme();
  const spokeTheme = useSpokeTheme();
  const { t } = useTranslation();
  const [clickStepIndex, setClickStepIndex] = useState(0);

  const lblOk = t("ok");
  const lblRecipientOk = `${titleCase(t("recipient")) + lblOk}?`;
  const lblMessageOk = `${titleCase(t("message_one")) + lblOk}?`;
  const lblSend = t("send");
  const lblSendMessage = `${lblSend + lblOk}?`;

  const clickStepLabels = props.threeClickEnabled
    ? [lblRecipientOk, lblMessageOk, lblSendMessage]
    : [lblSend];

  const handleTouchTap = () => {
    const { onFinalTouchTap } = props;

    if (clickStepIndex < clickStepLabels.length - 1) {
      setClickStepIndex(clickStepIndex + 1);
    } else {
      onFinalTouchTap();
    }
  };

  return (
    <Button
      {...dataTest("send")}
      variant="contained"
      style={{ backgroundColor: theme.palette.success.main, ...props.style }}
      onClick={handleTouchTap}
      disabled={props.disabled}
      color={spokeTheme?.successColor === undefined ? "primary" : "default"}
    >
      {clickStepLabels[clickStepIndex]}
    </Button>
  );
};

export default SendButton;
