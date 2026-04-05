import { useMutation, useQuery } from "@apollo/client";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import Alert from "@material-ui/lab/Alert";
import Skeleton from "@material-ui/lab/Skeleton";
import React from "react";

import {
  EDIT_ORGANIZATION_SETTINGS,
  GET_ORGANIZATION_SETTINGS
} from "./queries";

interface ContactDisplaySettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const ContactDisplaySettingsCard: React.FC<ContactDisplaySettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { error: saveError }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  if (loading) return <Skeleton>Loading...</Skeleton>;
  if (error) {
    return (
      <Alert severity="error" style={style}>
        Error loading settings
      </Alert>
    );
  }

  const { showContactLastName, showContactCell } =
    data?.organization?.settings || {};

  const handleToggle = async (field: string, value: boolean) => {
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            [field]: value
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card style={style}>
      <CardHeader title="Contact Information Display" />
      <CardContent>
        {saveError && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {saveError.message || "Failed to save settings"}
          </Alert>
        )}
        <Typography variant="body1" gutterBottom>
          Choose how much information about a contact is displayed to the
          texter.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={!!showContactLastName}
              onChange={(e) =>
                handleToggle("showContactLastName", e.target.checked)
              }
              color="primary"
            />
          }
          label="Show contact's last name?"
        />
        <FormControlLabel
          control={
            <Switch
              checked={!!showContactCell}
              onChange={(e) =>
                handleToggle("showContactCell", e.target.checked)
              }
              color="primary"
            />
          }
          label="Show contact's cell phone number?"
        />
      </CardContent>
    </Card>
  );
};

export default ContactDisplaySettingsCard;
