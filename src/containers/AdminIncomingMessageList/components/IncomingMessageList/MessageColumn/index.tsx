import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import type { ConversationInfoFragment } from "@spoke/spoke-codegen";
import {
  useGetCampaignVariablesLazyQuery,
  useGetCurrentUserProfileLazyQuery,
  useGetMessageReviewContactUpdatesQuery
} from "@spoke/spoke-codegen";
import isNil from "lodash/isNil";
import React, { useCallback, useEffect, useState } from "react";

import CannedResponseMenu from "../../../../../components/CannedResponseMenu";
import {
  applyScript,
  customFieldsJsonStringToArray
} from "../../../../../lib/scripts";

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
  const { contact, campaign } = conversation;

  const [messageText, setMessageText] = useState("");
  const [anchorEl, setAnchorEl] = useState<Element | null>(null);

  const { data: updatedContactData } = useGetMessageReviewContactUpdatesQuery({
    variables: { campaignContactId: contact.id }
  });

  const updatedContact = updatedContactData?.contact;
  const messages = updatedContact?.messages ?? contact.messages;
  const isOptedOut = !isNil(updatedContact?.optOut?.cell);

  const [getCampaignVariables] = useGetCampaignVariablesLazyQuery();
  const [getCurrentUserProfile] = useGetCurrentUserProfileLazyQuery();

  const handleOpenCannedResponse: ClickButtonHandler = useCallback(
    (event) => {
      setAnchorEl(event.currentTarget);
    },
    [setAnchorEl]
  );

  const setScriptMessageText = async (script: string) => {
    const customFields = customFieldsJsonStringToArray(contact.customFields);

    const { data: cvData } = await getCampaignVariables({
      variables: {
        campaignId: campaign.id
      }
    });
    const campaignVariables = cvData?.campaign?.campaignVariables ?? [];

    const { data: userData } = await getCurrentUserProfile();
    const texter = userData?.currentUser;

    if (texter) {
      const appliedScript = applyScript({
        script,
        contact,
        customFields,
        campaignVariables,
        texter
      });
      setMessageText(appliedScript);
    }
  };

  const handleScriptSelected = useCallback(
    (script: string) => {
      setAnchorEl(null);
      setScriptMessageText(script);
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
            <MessageOptOut contact={contact} isOptedOut={isOptedOut} />
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
