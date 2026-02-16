import { useMutation, useQuery } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import { css, StyleSheet } from "aphrodite";
import React, { useState } from "react";

import { DateTime, parseIanaZone } from "../../../lib/datetime";
import { timezones } from "../../../lib/timezones";
import {
  GET_ORGANIZATION_SETTINGS,
  UPDATE_DEFAULT_TEXTING_TIMEZONE,
  UPDATE_TEXTING_HOURS,
  UPDATE_TEXTING_HOURS_ENFORCEMENT
} from "./queries";

const styles = StyleSheet.create({
  sectionLabel: {
    opacity: 0.8,
    marginRight: 5
  },
  textingHoursSpan: {
    fontWeight: "bold"
  },
  dialogActions: {
    marginTop: 20
  }
});

interface TextingHoursSettingsCardProps {
  organizationId: string;
  style?: React.CSSProperties;
}

const formatTextingHours = (hour: number) =>
  DateTime.local().set({ hour }).toFormat("h a");

const TextingHoursSettingsCard: React.FC<TextingHoursSettingsCardProps> = ({
  organizationId,
  style
}) => {
  const { data, loading, error } = useQuery(GET_ORGANIZATION_SETTINGS, {
    variables: { organizationId }
  });

  const [updateTextingHours] = useMutation(UPDATE_TEXTING_HOURS);
  const [updateEnforcement] = useMutation(UPDATE_TEXTING_HOURS_ENFORCEMENT);
  const [updateTimezone] = useMutation(UPDATE_DEFAULT_TEXTING_TIMEZONE);

  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);

  // Dialog state
  const [tempStart, setTempStart] = useState<number>(9);
  const [tempEnd, setTempEnd] = useState<number>(21);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading settings</div>;

  const org = data.organization;
  const {
    textingHoursEnforced,
    textingHoursStart,
    textingHoursEnd,
    defaultTextingTz
  } = org;

  const handleOpenDialog = () => {
    setTempStart(textingHoursStart);
    setTempEnd(textingHoursEnd);
    setHoursDialogOpen(true);
  };

  const handleSaveHours = async () => {
    try {
      await updateTextingHours({
        variables: {
          organizationId,
          textingHoursStart: Number(tempStart),
          textingHoursEnd: Number(tempEnd)
        }
      });
      setHoursDialogOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const hourChoices = [...Array(25).keys()].map((hour) => ({
    value: hour,
    label: formatTextingHours(hour)
  }));

  return (
    <Card style={style}>
      <CardHeader title="Texting Hours" />
      <CardContent>
        <Typography variant="body1" gutterBottom>
          Default Texting Timezone
        </Typography>
        <Select
          value={defaultTextingTz ? parseIanaZone(defaultTextingTz) : ""}
          onChange={(e) =>
            updateTimezone({
              variables: {
                organizationId,
                defaultTextingTz: e.target.value as string
              }
            })
          }
          fullWidth
          native={false}
        >
          {timezones.map((timezone: string) => (
            <MenuItem key={timezone} value={parseIanaZone(timezone)}>
              {timezone}
            </MenuItem>
          ))}
        </Select>

        <div style={{ marginTop: 20 }}>
          <FormControlLabel
            control={
              <Switch
                checked={textingHoursEnforced}
                onChange={(e) =>
                  updateEnforcement({
                    variables: {
                      organizationId,
                      textingHoursEnforced: e.target.checked
                    }
                  })
                }
                color="primary"
              />
            }
            label="Enforce texting hours?"
          />
        </div>

        {textingHoursEnforced && (
          <div style={{ marginTop: 10 }}>
            <span className={css(styles.sectionLabel)}>Texting hours:</span>
            <span className={css(styles.textingHoursSpan)}>
              {formatTextingHours(textingHoursStart)} to{" "}
              {formatTextingHours(textingHoursEnd)}
            </span>{" "}
            in your organization's local time. Timezone {defaultTextingTz}.
          </div>
        )}
      </CardContent>
      <CardActions>
        {textingHoursEnforced && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenDialog}
          >
            Change texting hours
          </Button>
        )}
      </CardActions>

      <Dialog
        open={hoursDialogOpen}
        onClose={() => setHoursDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Change Texting Hours</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 15 }}>
            <Typography variant="caption">Start time</Typography>
            <Select
              fullWidth
              value={tempStart}
              onChange={(e) => setTempStart(Number(e.target.value))}
            >
              {hourChoices.map((h) => (
                <MenuItem key={`start-${h.value}`} value={h.value}>
                  {h.label}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <Typography variant="caption">End time</Typography>
            <Select
              fullWidth
              value={tempEnd}
              onChange={(e) => setTempEnd(Number(e.target.value))}
            >
              {hourChoices.map((h) => (
                <MenuItem key={`end-${h.value}`} value={h.value}>
                  {h.label}
                </MenuItem>
              ))}
            </Select>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoursDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveHours} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TextingHoursSettingsCard;
