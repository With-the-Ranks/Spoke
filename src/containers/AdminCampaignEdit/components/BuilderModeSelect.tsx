import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { CampaignBuilderMode } from "@spoke/spoke-codegen";
import React from "react";

export interface BuilderModeSelectProps {
  builderMode: CampaignBuilderMode;
  onBuilderModeChange: (mode: CampaignBuilderMode) => void;
}

export const BuilderModeSelect: React.FC<BuilderModeSelectProps> = ({
  builderMode,
  onBuilderModeChange
}) => (
  <FormControl style={{ width: 120 }}>
    <InputLabel id="campaign-builder-mode-label">Builder Mode</InputLabel>
    <Select
      labelId="campaign-builder-mode-label"
      id="campaign-builder-mode-select"
      fullWidth
      value={builderMode}
      onChange={(event) => {
        onBuilderModeChange(event.target.value as CampaignBuilderMode);
      }}
    >
      <MenuItem value={CampaignBuilderMode.Basic}>Basic</MenuItem>
      <MenuItem value={CampaignBuilderMode.Advanced}>Advanced</MenuItem>
    </Select>
  </FormControl>
);

export default BuilderModeSelect;
