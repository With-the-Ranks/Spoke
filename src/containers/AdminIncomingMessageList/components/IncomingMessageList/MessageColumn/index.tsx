import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import type { ConversationInfoFragment } from "@spoke/spoke-codegen";
import { useGetMessagesForContactQuery } from "@spoke/spoke-codegen";
import isNil from "lodash/isNil";
import React, { useCallback, useState } from "react";
import CannedResponseMenu from "src/components/CannedResponseMenu";

import MessageList from "./MessageList";
import MessageOptOut from "./MessageOptOut";
import MessageResponse from "./MessageResponse";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1
  }
};

type ClickButtonHandler = React.MouseEventHandler<HTMLButtonElement>;

interface Props {
  organizationId: string;
  conversation: ConversationInfoFragment;
}

const MessageColumn: React.FC<Props> = (props) => {
  const { organizationId, conversation } = props;
  const { contact } = conversation;

  const [messageText, setMessageText] = useState("");
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [isOptedOut, setIsOptedOut] = useState(
    !isNil(conversation.contact.optOut?.cell)
  );

  const { data: messageData } = useGetMessagesForContactQuery({
    variables: { campaignContactId: contact.id }
  });
  const messages = messageData?.contact?.messages ?? [];

  const handleOpenCannedResponse: ClickButtonHandler = useCallback(
    (event) => {
      setAnchorEl(event.currentTarget);
    },
    [setAnchorEl]
  );

  const handleScriptSelected = useCallback(
    (script: string) => {
      setAnchorEl(null);
      setMessageText(script);
    },
    [setAnchorEl]
  );

  const handleRequestClose = useCallback(() => setAnchorEl(null), [
    setAnchorEl
  ]);

  return (
    <>
      <div style={styles.container}>
        <h4>Messages</h4>
        <MessageList messages={messages} organizationId={organizationId} />
        {!isOptedOut && (
          <MessageResponse
            value={messageText}
            conversation={conversation}
            onChange={setMessageText}
          />
        )}
        <Grid container spacing={2} justify="flex-end">
          <Grid item>
            <MessageOptOut
              contact={contact}
              isOptedOut={isOptedOut}
              optOutChanged={setIsOptedOut}
            />
          </Grid>
          {!isOptedOut && (
            <Grid item>
              <Button variant="contained" onClick={handleOpenCannedResponse}>
                Canned Responses
              </Button>
            </Grid>
          )}
        </Grid>
      </div>
      <CannedResponseMenu
        anchorEl={anchorEl ?? undefined}
        campaignId={conversation.campaign.id}
        onSelectCannedResponse={handleScriptSelected}
        onRequestClose={handleRequestClose}
      />
    </>
  );
};

export default MessageColumn;
