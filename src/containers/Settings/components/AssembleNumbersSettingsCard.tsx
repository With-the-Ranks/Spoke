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

interface AssembleNumbersSettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const AssembleNumbersSettingsCard: React.FC<AssembleNumbersSettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [editSettings, { loading: saving }] = useMutation(
    EDIT_ORGANIZATION_SETTINGS
  );

  const [apiKey, setApiKey] = useState<string | null>("");

  useEffect(() => {
    if (data?.organization?.settings) {
      // API key can be null.
      setApiKey(data.organization.settings.numbersApiKey || "");
    }
  }, [data]);

  const currentApiKey = data?.organization?.settings?.numbersApiKey || "";
  // Check against null/empty string handling.
  // If current is null and apiKey is "", it's no change if we treat them same.
  const noChange = (apiKey || "") === (currentApiKey || "");

  const handleSave = async () => {
    if (noChange) return;
    try {
      await editSettings({
        variables: {
          id: organizationId,
          input: {
            numbersApiKey: apiKey || null // Send null if empty if that's desired, or empty string. Schema says nullable?
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
      <CardHeader title="Assemble Numbers API Key" />
      <CardContent>
        <Typography variant="body1" gutterBottom>
          To enable automatic filtering of landline phone numbers, you will need
          to put in your Assemble Numbers API Key here.
        </Typography>
        <TextField
          label="Assemble Numbers API Key"
          fullWidth
          value={apiKey || ""}
          onChange={(e) => setApiKey(e.target.value)}
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
          Save Api Key
        </Button>
      </CardActions>
    </Card>
  );
};

export default AssembleNumbersSettingsCard;
