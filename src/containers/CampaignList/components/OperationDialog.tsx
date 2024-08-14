/* eslint-disable jsx-a11y/label-has-associated-control */
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import type { GraphQLError } from "graphql";
import TextField from "material-ui/TextField";
import Toggle from "material-ui/Toggle";
import React, { useState } from "react";

import LoadingIndicator from "../../../components/LoadingIndicator";
import type {
  MarkForSecondPass,
  Operation,
  ReleaseUnrepliedMessages
} from "../utils";
import {
  dialogOperations,
  isMarkForSecondPass,
  isReleaseUnrepliedMessages
} from "../utils";

export interface OperationDialogBodyProps {
  inProgress: Operation;
  finished: string | undefined;
  executing: boolean;
  error: GraphQLError | undefined;
  setInProgress: (inProgress: Operation) => void;
}

export interface OperationDialogProps extends OperationDialogBodyProps {
  clearInProgress: () => void;
  executeOperation: () => void;
}

export const OperationDialogBody = (props: OperationDialogBodyProps) => {
  const { inProgress, finished, executing, error, setInProgress } = props;

  const { name: operationName, campaign } = inProgress;
  const operationDefinition = dialogOperations[operationName];

  const setVal = <T extends Operation>(
    argToChange: keyof T["payload"],
    val: any
  ) => {
    const nextInProgress: any = { ...inProgress };
    nextInProgress.payload[argToChange] = val as T[typeof argToChange];
    return nextInProgress;
  };

  if (executing) return <LoadingIndicator />;
  if (error)
    return <span style={{ color: "red" }}> {JSON.stringify(error)} </span>;
  if (finished) return <div>{finished}</div>;

  if (isReleaseUnrepliedMessages(inProgress)) {
    return (
      <div>
        {operationDefinition?.body(campaign)}
        <br />
        <p>
          <label>
            {" "}
            How many hours ago should a conversation have been idle for it to be
            unassigned?{" "}
          </label>
          <TextField
            type="number"
            floatingLabelText="Number of Hours"
            defaultValue={1}
            value={inProgress.payload.ageInHours}
            onChange={(_ev, val) => {
              const newInProgress = setVal<ReleaseUnrepliedMessages>(
                "ageInHours",
                parseInt(val, 10)
              );
              setInProgress(newInProgress);
            }}
          />
        </p>
      </div>
    );
  }

  if (isMarkForSecondPass(inProgress)) {
    const {
      excludeNewer,
      excludeRecentlyTexted,
      days,
      hours
    } = inProgress.payload;
    return (
      <div>
        <p>{operationDefinition?.body(campaign)}</p>
        <p>
          To read about best practices for second passes, head{" "}
          <a
            href="https://withtheranks.com/docs/spoke/for-spoke-admins/running-a-second-pass/"
            rel="noreferrer"
            target="_blank"
          >
            here
          </a>
          .
        </p>
        <br />
        <div style={{ width: "100%", display: "flex", flexDirection: "row" }}>
          <div style={{ flexGrow: 1 }}>
            <Toggle
              label="Exclude recently texted contacts?"
              toggled={excludeRecentlyTexted}
              onToggle={(_ev, val) => {
                const newInProgress = setVal<MarkForSecondPass>(
                  "excludeRecentlyTexted",
                  val
                );
                setInProgress(newInProgress);
              }}
            />
          </div>
          <div style={{ flexGrow: 1 }}>
            {excludeRecentlyTexted &&
              "Exclude contacts messaged within the last:"}
            {excludeRecentlyTexted && (
              <div style={{ display: "flex" }}>
                <TextField
                  style={{ flexGrow: 1, margin: "10px" }}
                  type="number"
                  floatingLabelText="Number of Days"
                  value={days}
                  onChange={(_ev, val) => {
                    const newInProgress = setVal<MarkForSecondPass>(
                      "days",
                      parseInt(val, 10)
                    );
                    setInProgress(newInProgress);
                  }}
                />
                <TextField
                  style={{ flexGrow: 1, margin: "10px" }}
                  type="number"
                  floatingLabelText="Number of Hours"
                  value={hours}
                  onChange={(_ev, val) => {
                    const newInProgress = setVal<MarkForSecondPass>(
                      "hours",
                      parseInt(val, 10)
                    );
                    setInProgress(newInProgress);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <br />
        <Toggle
          label="Exclude contacts uploaded on a newer campaign?"
          toggled={excludeNewer}
          onToggle={(_ev, val) => {
            const newInProgress = setVal<MarkForSecondPass>(
              "excludeNewer",
              val
            );
            setInProgress(newInProgress);
          }}
        />
      </div>
    );
  }

  return <div>{operationDefinition?.body(campaign)}</div>;
};

const DELETION_PROTECTION_TEXT = "delete contacts";

export const OperationDialog: React.FC<OperationDialogProps> = (props) => {
  const [
    pendingDeletionProtectionCheck,
    setPendingDeletionProtectionCheck
  ] = useState(false);
  const [
    deletionProtectionCheckText,
    setDeletionProtectionCheckText
  ] = useState<string | undefined>(undefined);

  const startDeletionProtectionCheck = () =>
    setPendingDeletionProtectionCheck(true);

  const {
    inProgress,
    finished,
    executing,
    clearInProgress,
    executeOperation
  } = props;

  const { name: operationName, campaign } = inProgress;
  const operationDefinition = dialogOperations[operationName];

  const useDeletionProtection =
    operationDefinition?.deletionProtection ?? false;
  const deletionProtectionChallengeCompleted =
    deletionProtectionCheckText === DELETION_PROTECTION_TEXT;

  const actions = finished
    ? [
        <Button key="done" color="primary" onClick={clearInProgress}>
          Done
        </Button>
      ]
    : [
        <Button
          key="cancel"
          color="primary"
          disabled={executing}
          onClick={clearInProgress}
        >
          Cancel
        </Button>,
        <Button
          key="execute"
          color="primary"
          disabled={
            pendingDeletionProtectionCheck &&
            !deletionProtectionChallengeCompleted
          }
          onClick={
            useDeletionProtection
              ? deletionProtectionChallengeCompleted
                ? executeOperation
                : startDeletionProtectionCheck
              : executeOperation
          }
        >
          Execute Operation
        </Button>
      ];

  return (
    <Dialog open maxWidth="lg" onClose={clearInProgress}>
      <DialogTitle>{operationDefinition?.title(campaign)}</DialogTitle>
      <DialogContent>
        <OperationDialogBody {...props} />
        {!(executing || finished) && pendingDeletionProtectionCheck && (
          <TextField
            floatingLabelText={`To continue, type ${DELETION_PROTECTION_TEXT}`}
            fullWidth
            onChange={(_, val) => setDeletionProtectionCheckText(val)}
            value={deletionProtectionCheckText}
          />
        )}
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
};
