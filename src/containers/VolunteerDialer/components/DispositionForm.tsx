import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";

export type Disposition =
  | "answered"
  | "no_answer"
  | "voicemail"
  | "busy"
  | "do_not_call";

interface DispositionFormProps {
  onSubmit: (disposition: Disposition) => void;
  isSubmitting: boolean;
  // Pre-selected disposition, auto-derived from the call outcome. The volunteer
  // can still change it before saving.
  initialDisposition?: Disposition;
}

const DISPOSITIONS: { value: Disposition; label: string }[] = [
  { value: "answered", label: "Answered" },
  { value: "no_answer", label: "No Answer" },
  { value: "voicemail", label: "Left Voicemail" },
  { value: "busy", label: "Busy" },
  { value: "do_not_call", label: "Do Not Call" }
];

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 600
  },
  formControl: {
    minWidth: 220,
    marginBottom: theme.spacing(2)
  },
  submitButton: {
    display: "block"
  }
}));

const DispositionForm: React.FC<DispositionFormProps> = ({
  onSubmit,
  isSubmitting,
  initialDisposition = "answered"
}) => {
  const classes = useStyles();
  const [disposition, setDisposition] = useState<Disposition>(
    initialDisposition
  );

  const handleSubmit = () => {
    onSubmit(disposition);
  };

  return (
    <div className={classes.root}>
      <Typography className={classes.title} variant="subtitle1">
        Call Outcome
      </Typography>
      <FormControl className={classes.formControl} variant="outlined">
        <InputLabel id="disposition-label">Disposition</InputLabel>
        <Select
          labelId="disposition-label"
          label="Disposition"
          value={disposition}
          onChange={(e) => setDisposition(e.target.value as Disposition)}
        >
          {DISPOSITIONS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        className={classes.submitButton}
        color="primary"
        disabled={isSubmitting}
        onClick={handleSubmit}
        variant="contained"
      >
        {isSubmitting ? "Saving…" : "Save & Next"}
      </Button>
    </div>
  );
};

export default DispositionForm;
