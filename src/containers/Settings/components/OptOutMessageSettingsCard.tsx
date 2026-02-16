import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import TextField from "@material-ui/core/TextField";
import Alert from "@material-ui/lab/Alert";
import React, { useEffect, useState } from "react";

import {
  EDIT_ORGANIZATION_SETTINGS,
  GET_ORGANIZATION_SETTINGS
} from "./queries";

interface OptOutMessageSettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const OptOutMessageSettingsCard: React.FC<OptOutMessageSettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { loading: saving }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (data?.organization?.settings?.optOutMessage) {
      setMessage(data.organization.settings.optOutMessage);
    }
  }, [data]);

  const currentMessage = data?.organization?.settings?.optOutMessage || "";
  const noChange = message === currentMessage;

  const handleSave = async () => {
    if (noChange || !message) return;
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            optOutMessage: message
          }
        }
      });
    } catch (e) {
      console.error(e);
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
      <CardHeader title="Opt Out Message" />
      <CardContent>
        <TextField
          label="Default Opt-Out Message"
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          variant="standard"
        />
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color="primary"
          disabled={saving || noChange || !message}
          onClick={handleSave}
        >
          Save Opt-Out Message
        </Button>
      </CardActions>
    </Card>
  );
};

export default OptOutMessageSettingsCard;
