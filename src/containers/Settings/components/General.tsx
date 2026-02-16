import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import React, { useState } from "react";

import AssembleNumbersSettingsCard from "./AssembleNumbersSettingsCard";
import AutoApprovalSettingsCard from "./AutoApprovalSettingsCard";
import AutosendingSettingsCard from "./AutosendingSettingsCard";
import CampaignBuilderSettingsCard from "./CampaignBuilderSettingsCard";
import ContactDisplaySettingsCard from "./ContactDisplaySettingsCard";
import EditName from "./EditName";
import MessageSendingSettingsCard from "./MessageSendingSettingsCard";
import OptOutMessageSettingsCard from "./OptOutMessageSettingsCard";
import RejectedTextersMessageCard from "./RejectedTextersMessageCard";
import ScriptPreviewSettingsCard from "./ScriptPreviewSettingsCard";
import TextingHoursSettingsCard from "./TextingHoursSettingsCard";
import TrollWebhookSettingsCard from "./TrollWebhookSettingsCard";

interface GeneralProps {
  match: {
    params: {
      organizationId: string;
    };
  };
}

const General: React.FC<GeneralProps> = ({ match }) => {
  const { organizationId } = match.params;
  const [error] = useState<string | undefined>(undefined);

  // Note: Individual components now handle their own error display or loading states.
  // We can add a global error boundary or context if needed, but for now we rely on local handling.

  return (
    <div>
      <EditName organizationId={organizationId} style={{ marginBottom: 20 }} />

      <AutoApprovalSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <RejectedTextersMessageCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <OptOutMessageSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <TextingHoursSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <AssembleNumbersSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <ContactDisplaySettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <CampaignBuilderSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <ScriptPreviewSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <AutosendingSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      <MessageSendingSettingsCard
        organizationId={organizationId}
        style={{ marginBottom: 20 }}
      />

      {window.ENABLE_TROLLBOT && (
        <TrollWebhookSettingsCard
          organizationId={organizationId}
          style={{ marginBottom: 20 }}
        />
      )}

      {error && (
        <Dialog open>
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <DialogContentText>{error}</DialogContentText>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default General;
