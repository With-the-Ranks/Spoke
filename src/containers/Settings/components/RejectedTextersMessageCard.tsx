import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import TextField from "@material-ui/core/TextField";
import Alert from "@material-ui/lab/Alert";
import Skeleton from "@material-ui/lab/Skeleton";
import React, { useEffect, useState } from "react";

import {
  EDIT_ORGANIZATION_SETTINGS,
  GET_ORGANIZATION_SETTINGS
} from "./queries";

interface RejectedTextersMessageProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const RejectedTextersMessageCard: React.FC<RejectedTextersMessageProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { loading: saving, error: saveError }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (data?.organization?.settings?.doNotAssignMessage) {
      setMessage(data.organization.settings.doNotAssignMessage);
    }
  }, [data]);

  if (loading) return <Skeleton>Loading...</Skeleton>;
  if (error) {
    return (
      <Alert severity="error" style={style}>
        Error loading settings
      </Alert>
    );
  }

  const { showDoNotAssignMessage } = data?.organization?.settings || {};
  const currentMessage = data?.organization?.settings?.doNotAssignMessage || "";
  const noChange = message === currentMessage;

  const handleToggle = async (checked: boolean) => {
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            showDoNotAssignMessage: checked
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (noChange || !message) return;
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            doNotAssignMessage: message
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card style={style}>
      <CardHeader title="Rejected Texters Message" />
      <CardContent>
        {saveError && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {saveError.message || "Failed to save settings"}
          </Alert>
        )}
        <FormControlLabel
          label="Show different message when user has do not assign?"
          labelPlacement="start"
          control={
            <Switch
              checked={!!showDoNotAssignMessage}
              onChange={(e) => handleToggle(e.target.checked)}
              color="primary"
            />
          }
        />
        {showDoNotAssignMessage && (
          <div style={{ marginTop: 10 }}>
            <TextField
              label="Do Not Assign Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="standard"
            />
            <CardActions style={{ paddingLeft: 0, marginTop: 10 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving || noChange || !message}
              >
                Save Do Not Assign Message
              </Button>
            </CardActions>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RejectedTextersMessageCard;
