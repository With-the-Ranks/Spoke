import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import React, { useEffect, useState } from "react";

import {
  EDIT_ORGANIZATION_SETTINGS,
  GET_ORGANIZATION_SETTINGS
} from "./queries";

interface TrollWebhookSettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const TrollWebhookSettingsCard: React.FC<TrollWebhookSettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { loading: saving }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (data?.organization?.settings) {
      setUrl(data.organization.settings.trollbotWebhookUrl || "");
    }
  }, [data]);

  const currentUrl = data?.organization?.settings?.trollbotWebhookUrl || "";
  const noChange = (url || "") === (currentUrl || "");

  const handleSave = async () => {
    if (noChange) return;
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            trollbotWebhookUrl: url || null
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading settings</div>;

  return (
    <Card style={style}>
      <CardHeader title="TrollBot" />
      <CardContent>
        <Typography variant="body1" gutterBottom>
          If set, a payload will be sent to this URL for every TrollBot alarm.
        </Typography>
        <TextField
          label="Webhook URL"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          variant="standard"
        />
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color="primary"
          disabled={saving || noChange}
          onClick={handleSave}
        >
          Save Trollbot Url
        </Button>
      </CardActions>
    </Card>
  );
};

export default TrollWebhookSettingsCard;
