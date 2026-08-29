import Button from "@material-ui/core/Button";
import { useSetCampaignArchivedMutation } from "@spoke/spoke-codegen";
import React from "react";

export interface ArchiveCampaignButtonProps {
  campaignId: string;
  isArchived: boolean;
}

export const ArchiveCampaignButton: React.FC<ArchiveCampaignButtonProps> = (
  props
) => {
  const { campaignId, isArchived } = props;
  const [setCampaignArchived] = useSetCampaignArchivedMutation();

  return (
    <Button
      variant="outlined"
      onClick={() =>
        setCampaignArchived({
          variables: { campaignId, archived: !isArchived }
        })
      }
    >
      {isArchived ? "Unarchive" : "Archive"}
    </Button>
  );
};

export default ArchiveCampaignButton;
