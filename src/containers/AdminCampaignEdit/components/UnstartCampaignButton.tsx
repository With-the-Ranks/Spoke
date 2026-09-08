import Button from "@material-ui/core/Button";
import { useUnstartCampaignMutation } from "@spoke/spoke-codegen";
import React from "react";

export interface UnstartCampaignButtonProps {
  campaignId: string;
  onError: (errorMessage: string) => void;
}

export const UnstartCampaignButton: React.FC<UnstartCampaignButtonProps> = (
  props
) => {
  const { campaignId, onError } = props;
  const [
    unstartCampaign,
    { loading: unstarting }
  ] = useUnstartCampaignMutation();

  const handleClick = async () => {
    const result = await unstartCampaign({ variables: { campaignId } });
    if (result.errors) {
      onError(result.errors.map((error) => error.message).join(", "));
    }
  };

  return (
    <Button variant="outlined" disabled={unstarting} onClick={handleClick}>
      Unstart
    </Button>
  );
};

export default UnstartCampaignButton;
