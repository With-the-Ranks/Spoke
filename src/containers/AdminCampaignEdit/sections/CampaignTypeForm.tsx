import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import PhoneIcon from "@material-ui/icons/Phone";
import SmsIcon from "@material-ui/icons/Sms";
import {
  CampaignType,
  useEditCampaignTypeMutation,
  useGetCampaignTypeQuery
} from "@spoke/spoke-codegen";
import React, { useState } from "react";
import { compose } from "recompose";

import CampaignFormSectionHeading from "../components/CampaignFormSectionHeading";
import type { FullComponentProps } from "../components/SectionWrapper";
import { asSection } from "../components/SectionWrapper";

const CampaignTypeForm: React.FC<FullComponentProps> = (props) => {
  const { campaignId, saveLabel, onError } = props;
  const [pendingType, setPendingType] = useState<CampaignType | undefined>(
    undefined
  );
  const [isWorking, setIsWorking] = useState(false);

  const { data } = useGetCampaignTypeQuery({ variables: { campaignId } });
  const [editCampaignType] = useEditCampaignTypeMutation();

  const campaign = data?.campaign;
  const isStarted = campaign?.isStarted ?? false;
  const hasContacts = (campaign?.contactsCount ?? 0) > 0;
  // Contacts live in type-specific tables, so the type can't change once they're
  // uploaded (or the campaign has started).
  const isLocked = isStarted || hasContacts;
  const savedType = campaign?.campaignType ?? CampaignType.Sms;
  const campaignType = pendingType ?? savedType;

  const hasPendingChanges =
    pendingType !== undefined && pendingType !== savedType;
  const isSaveDisabled = isWorking || !hasPendingChanges || isLocked;
  const finalSaveLabel = isWorking ? "Working..." : saveLabel;

  const handleChange = (
    _event: React.ChangeEvent<HTMLInputElement>,
    value: string
  ) => setPendingType(value as CampaignType);

  const handleSubmit = async () => {
    if (pendingType === undefined) return;
    setIsWorking(true);
    try {
      const response = await editCampaignType({
        variables: { campaignId, payload: { campaignType: pendingType } }
      });
      if (response.errors) throw response.errors;
      setPendingType(undefined);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div>
      <CampaignFormSectionHeading
        title="Campaign type"
        subtitle="Choose whether this campaign will send text messages or make phone calls."
      />
      <FormControl component="fieldset" disabled={isLocked}>
        <FormLabel component="legend">Type</FormLabel>
        <RadioGroup
          name="campaignType"
          value={campaignType}
          onChange={handleChange}
          row
        >
          <FormControlLabel
            value={CampaignType.Sms}
            control={<Radio />}
            label="SMS"
          />
          <FormControlLabel
            value={CampaignType.Call}
            control={<Radio />}
            label="Call"
          />
        </RadioGroup>
      </FormControl>
      {isLocked && (
        <p style={{ color: "gray", fontSize: 12 }}>
          {isStarted
            ? "Campaign type cannot be changed after the campaign has started."
            : "Campaign type cannot be changed after contacts have been uploaded."}
        </p>
      )}
      <div style={{ marginTop: 16 }}>
        <Button
          variant="contained"
          disabled={isSaveDisabled}
          onClick={handleSubmit}
        >
          {finalSaveLabel}
        </Button>
      </div>
    </div>
  );
};

export default compose<FullComponentProps, FullComponentProps>(
  asSection({
    title: "Campaign Type",
    readinessName: "campaignType",
    jobQueueNames: [],
    expandAfterCampaignStarts: false,
    expandableBySuperVolunteers: false,
    avatarIcon: ({ campaignType }) =>
      campaignType === CampaignType.Call ? <PhoneIcon /> : <SmsIcon />
  })
)(CampaignTypeForm);
