import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import FormControl from "@material-ui/core/FormControl";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Typography from "@material-ui/core/Typography";
import Alert from "@material-ui/lab/Alert";
import React, { useState } from "react";

import { RequestAutoApproveType } from "../../../api/organization-membership";
import { snakeToTitleCase } from "../../../lib/attributes";
import {
  EDIT_ORGANIZATION_SETTINGS,
  GET_ORGANIZATION_SETTINGS
} from "./queries";

interface AutoApprovalSettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const AutoApprovalSettingsCard: React.FC<AutoApprovalSettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { loading: saving }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  const [approvalLevel, setApprovalLevel] = useState<string | undefined>(
    undefined
  );

  // Derive current level from props or data
  const currentLevel = data?.organization?.settings?.defaulTexterApprovalStatus;

  const displayedLevel = approvalLevel || currentLevel;
  const noChange = displayedLevel === currentLevel;

  const handleSave = async () => {
    if (!displayedLevel) return;
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            defaulTexterApprovalStatus: displayedLevel
          }
        }
      });
      setApprovalLevel(undefined); // Reset local state
    } catch (e) {
      console.error(e);
      // Ideally handle error UI state here or using global flash
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) {
    return (
      <Alert severity="error" style={style}>
        Error loading settings
      </Alert>
    );
  }

  return (
    <Card style={style}>
      <CardHeader title="Default Text Request Auto-Approval Level" />
      <CardContent>
        <Typography variant="body1" paragraph>
          When a new texter joins your organization they will be given this
          auto-approval level for requesting text assignments.
        </Typography>
        <FormControl fullWidth>
          <Select
            value={displayedLevel || ""}
            onChange={(e) => setApprovalLevel(e.target.value as string)}
            displayEmpty
          >
            {Object.keys(RequestAutoApproveType).map((level) => (
              <MenuItem key={level} value={level}>
                {snakeToTitleCase(level)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color="primary"
          disabled={saving || noChange}
          onClick={handleSave}
        >
          Save Default Level
        </Button>
      </CardActions>
    </Card>
  );
};

export default AutoApprovalSettingsCard;
