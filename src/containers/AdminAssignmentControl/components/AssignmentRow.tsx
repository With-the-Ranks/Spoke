import Chip from "@material-ui/core/Chip";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { TextRequestType } from "@spoke/spoke-codegen";
import MenuItem from "material-ui/MenuItem";
import SelectField from "material-ui/SelectField";
import Toggle from "material-ui/Toggle";
import React from "react";

import type {
  TagWithTitle,
  TeamForAssignment,
  TeamInputWithTags
} from "../types";

interface AssignmentRowProps {
  assignmentPool: TeamForAssignment;
  escalationTagList: TagWithTitle[];
  isRowDisabled: boolean;
  onChange: (payload: TeamInputWithTags) => Promise<void> | void;
}

const AssignmentRow: React.FC<AssignmentRowProps> = (props) => {
  const {
    assignmentPool,
    isRowDisabled = false,
    onChange,
    escalationTagList
  } = props;

  const {
    id,
    title,
    textColor,
    backgroundColor,
    isAssignmentEnabled,
    assignmentType,
    maxRequestCount,
    escalationTags
  } = assignmentPool;

  const handleToggleIsEnabled = (
    _event: React.MouseEvent<unknown, MouseEvent>,
    newIsAssignmentEnabled: boolean
  ) => {
    const payload: TeamInputWithTags = {
      isAssignmentEnabled: newIsAssignmentEnabled
    };
    if (newIsAssignmentEnabled) {
      const effectiveType = assignmentType ?? TextRequestType.Unreplied;
      if (!assignmentType) payload.assignmentType = effectiveType;

      if (!maxRequestCount) {
        payload.maxRequestCount =
          effectiveType === TextRequestType.Unreplied ? 10 : 100;
      }
    }
    onChange(payload);
  };

  const handleChangeAssignmentType = (
    _event: React.SyntheticEvent<unknown, Event>,
    _index: number,
    newAssignmentType: TextRequestType
  ) =>
    onChange({
      assignmentType: newAssignmentType,
      maxRequestCount:
        newAssignmentType === TextRequestType.Unreplied ? 10 : 100
    });

  const handleChangeMaxCount = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const rawValue = event?.target?.value;
    onChange({
      maxRequestCount: rawValue ? parseInt(rawValue, 10) : null
    });
  };

  const handleChangeEscalationTags = (
    _event: React.ChangeEvent<any>,
    value: TagWithTitle[]
  ): void => {
    onChange({ escalationTags: value });
  };

  const isSaveDisabled =
    isRowDisabled || !isAssignmentEnabled || id === "general";

  return (
    <Grid
      container
      spacing={2}
      wrap="nowrap"
      alignItems="center"
      justifyContent="space-between"
    >
      <Grid item>
        <Chip label={title} style={{ color: textColor, backgroundColor }} />
      </Grid>
      <Grid item>
        <Toggle
          label="Enable assignment?"
          labelPosition="right"
          toggled={isAssignmentEnabled}
          disabled={isRowDisabled}
          onToggle={handleToggleIsEnabled}
        />
      </Grid>
      <Grid item>
        <SelectField
          floatingLabelText="Assignment Type"
          value={assignmentType}
          disabled={isRowDisabled || !isAssignmentEnabled}
          onChange={handleChangeAssignmentType}
        >
          <MenuItem
            value={TextRequestType.Unsent}
            primaryText="Unsent Initial Messages"
          />
          <MenuItem
            value={TextRequestType.Unreplied}
            primaryText="Unhandled Replies"
          />
        </SelectField>
      </Grid>
      <Grid item style={{ width: 200 }}>
        <TextField
          label="Max to request at once"
          type="number"
          value={maxRequestCount ?? ""}
          disabled={isRowDisabled || !isAssignmentEnabled}
          required={isAssignmentEnabled}
          error={isAssignmentEnabled && !maxRequestCount}
          onChange={handleChangeMaxCount}
        />
      </Grid>
      <Grid item style={{ width: 300 }}>
        <Autocomplete
          multiple
          options={escalationTagList}
          value={escalationTags}
          getOptionLabel={(tag) => tag.title}
          filterSelectedOptions
          fullWidth
          onChange={handleChangeEscalationTags}
          disabled={isSaveDisabled}
          getOptionSelected={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              label={id === "general" ? "N/A" : "Custom Escalation Tags"}
              name="select-teams-autocomplete"
            />
          )}
        />
      </Grid>
    </Grid>
  );
};

export default AssignmentRow;
