import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import TextField from "@material-ui/core/TextField";
import Alert from "@material-ui/lab/Alert";
import React, { useEffect, useState } from "react";

import { EDIT_ORGANIZATION_NAME, GET_ORGANIZATION_NAME } from "./queries";

interface EditNameProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const EditName: React.FC<EditNameProps> = ({ organizationId, style }) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_NAME, {
    variables: { organizationId }
  });

  const [editName, { loading: saving }] = useMutation(EDIT_ORGANIZATION_NAME);

  const [orgName, setOrgName] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data?.organization?.name) {
      setOrgName(data.organization.name);
    }
  }, [data]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading organization name</div>;

  const currentName = data?.organization?.name || "";
  const value = orgName ?? currentName;
  const isDifferent = orgName !== undefined && orgName !== currentName;

  const saveOrganizationName = async () => {
    if (!orgName || !isDifferent) return;

    setErrorMsg(undefined);
    try {
      await editName({
        variables: {
          organizationId,
          input: {
            name: orgName
          }
        }
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <Card style={style}>
      <CardHeader title="Organization Name" />
      <CardContent>
        {errorMsg && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {errorMsg}
          </Alert>
        )}
        <TextField
          label="Organization Name"
          value={value}
          onChange={(e) => setOrgName(e.target.value)}
          fullWidth
          variant="standard"
        />
      </CardContent>
      <CardActions>
        <Button
          variant="contained"
          color="primary"
          disabled={saving || !isDifferent}
          onClick={saveOrganizationName}
        >
          Save Name
        </Button>
      </CardActions>
    </Card>
  );
};

export default EditName;
