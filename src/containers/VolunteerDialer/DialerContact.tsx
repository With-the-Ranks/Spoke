import Button from "@material-ui/core/Button";
import ButtonBase from "@material-ui/core/ButtonBase";
import Chip from "@material-ui/core/Chip";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Divider from "@material-ui/core/Divider";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import type { GetNextDialerContactQuery } from "@spoke/spoke-codegen";
import {
  useGetCurrentUserProfileQuery,
  useInitiateCallMutation,
  useMarkDialerContactCompleteMutation,
  useSaveDialerQuestionResponsesMutation,
  useTagDialerContactMutation,
  useUpdateDialerCallMutation
} from "@spoke/spoke-codegen";
import sample from "lodash/sample";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { applyScript, customFieldsJsonStringToArray } from "../../lib/scripts";
import CallControls from "./components/CallControls";
import CallStatusBar from "./components/CallStatusBar";
import CannedResponses from "./components/CannedResponses";
import type { Disposition } from "./components/DispositionForm";
import DispositionForm from "./components/DispositionForm";
import TagDialog from "./components/TagDialog";
import { useTelnyxWebRTC } from "./useTelnyxWebRTC";

type DialerContact = NonNullable<
  GetNextDialerContactQuery["getNextDialerContact"]
>;
type InteractionStep = DialerContact["interactionSteps"][0];

interface DialerContactProps {
  contact: DialerContact;
  assignmentId: string;
  organizationId: string;
  onNextContact: () => void;
}

const useStyles = makeStyles((theme) => ({
  root: {
    maxWidth: 720,
    margin: "0 auto",
    padding: theme.spacing(3),
    // Fill the full width when the dialer layout stacks on mobile.
    [theme.breakpoints.down("sm")]: {
      maxWidth: "none"
    }
  },
  header: {
    marginBottom: theme.spacing(2)
  },
  name: {
    fontWeight: 700
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    alignItems: "center",
    marginTop: theme.spacing(1)
  },
  tagChip: {
    fontWeight: 600
  },
  section: {
    marginBottom: theme.spacing(3)
  },
  transcript: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1)
  },
  row: {
    display: "flex"
  },
  rowLeft: {
    justifyContent: "flex-start"
  },
  rowRight: {
    justifyContent: "flex-end"
  },
  bubble: {
    maxWidth: "78%",
    padding: theme.spacing(1.25, 1.75),
    borderRadius: 16,
    whiteSpace: "pre-wrap",
    textAlign: "left"
  },
  scriptBubble: {
    backgroundColor: theme.palette.grey[100],
    borderTopLeftRadius: 4
  },
  answerBubble: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderTopRightRadius: 4,
    cursor: "pointer",
    transition: "opacity 0.15s",
    "&:hover": {
      opacity: 0.85
    }
  },
  question: {
    fontWeight: 600,
    marginBottom: theme.spacing(1)
  },
  answers: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    alignItems: "flex-end",
    marginTop: theme.spacing(2)
  },
  answerButton: {
    textTransform: "none"
  },
  endNote: {
    fontStyle: "italic",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(2)
  }
}));

const normalizeParentId = (
  parentInteractionId: string | null | undefined
): string | null =>
  !parentInteractionId ||
  parentInteractionId === "" ||
  parentInteractionId === "0"
    ? null
    : parentInteractionId;

const pickScript = (scriptOptions: Array<string | null | undefined>): string =>
  sample(scriptOptions.filter((s): s is string => !!s)) ?? "";

// Suggest a disposition from the Telnyx call outcome. If the call was answered
// we can't tell a live person from voicemail, so leave it to the volunteer.
const deriveDisposition = (
  wasAnswered: boolean,
  cause: string | null
): Disposition | undefined => {
  if (wasAnswered) return undefined;
  if (cause === "USER_BUSY") return "busy";
  // NO_ANSWER, NO_USER_RESPONSE, ORIGINATOR_CANCEL, CALL_REJECTED,
  // UNALLOCATED_NUMBER, timeouts, etc. all read as "nobody to talk to".
  return "no_answer";
};

// Map the Telnyx outcome to a dialer_call status (the call's result code,
// distinct from the human-chosen disposition).
const deriveCallStatus = (
  wasAnswered: boolean,
  cause: string | null
): string => {
  if (wasAnswered) return "COMPLETED";
  const errorCauses = [
    "UNALLOCATED_NUMBER",
    "INVALID_NUMBER_FORMAT",
    "NO_ROUTE_DESTINATION",
    "INCOMPATIBLE_DESTINATION"
  ];
  if (cause && errorCauses.includes(cause)) return "ERROR";
  return "NO_ANSWER";
};

// Reconcile the persisted status with the volunteer's final disposition.
const dispositionToStatus: Record<Disposition, string> = {
  answered: "COMPLETED",
  no_answer: "NO_ANSWER",
  voicemail: "VOICEMAIL",
  busy: "NO_ANSWER",
  do_not_call: "COMPLETED"
};

const DialerContact: React.FC<DialerContactProps> = ({
  contact,
  assignmentId,
  organizationId,
  onNextContact
}) => {
  const classes = useStyles();

  const {
    clientReady,
    callState,
    isMuted,
    callWasAnswered,
    callEndCause,
    callStartedAt,
    callEndedAt,
    dial,
    hangup,
    toggleMute,
    error: webRTCError
  } = useTelnyxWebRTC();

  const [dialerCallId, setDialerCallId] = useState<string | null>(null);
  const [pendingRewindIndex, setPendingRewindIndex] = useState<number | null>(
    null
  );
  const [showDisposition, setShowDisposition] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  // Canned responses the volunteer has pulled into the script this call. Reset
  // automatically per contact (DialerContact is keyed by contact id).
  const [insertedResponses, setInsertedResponses] = useState<
    Array<{ id: number; text: string }>
  >([]);
  const insertedResponseIdRef = useRef(0);

  // Index the interaction-step tree once per contact.
  const { stepById, childrenByParent, rootStep } = useMemo(() => {
    const byId = new Map<string, InteractionStep>();
    const childrenOf = new Map<string, InteractionStep[]>();
    const liveSteps = contact.interactionSteps.filter((s) => !s.isDeleted);

    liveSteps.forEach((step) => byId.set(step.id, step));
    liveSteps.forEach((step) => {
      const parentId = normalizeParentId(step.parentInteractionId);
      if (parentId) {
        const siblings = childrenOf.get(parentId) ?? [];
        siblings.push(step);
        childrenOf.set(parentId, siblings);
      }
    });

    const root = liveSteps.find(
      (step) => normalizeParentId(step.parentInteractionId) === null
    );
    return { stepById: byId, childrenByParent: childrenOf, rootStep: root };
  }, [contact.interactionSteps]);

  const childrenOf = useCallback(
    (stepId: string): InteractionStep[] => childrenByParent.get(stepId) ?? [],
    [childrenByParent]
  );

  // Pick one script variant per step, stable across re-renders.
  const scriptByStep = useMemo(() => {
    const map: Record<string, string> = {};
    contact.interactionSteps.forEach((step) => {
      map[step.id] = pickScript(step.scriptOptions ?? []);
    });
    return map;
  }, [contact.interactionSteps]);

  // Current user is the "texter" for {texterFirstName}/{texterLastName} tokens.
  const { data: profileData } = useGetCurrentUserProfileQuery();

  // Interpolate script tokens using the same engine as the texting view, so
  // contact fields, {texterFirstName}/{texterLastName}, campaign variables, and
  // custom fields all resolve consistently.
  const interpolate = useMemo(() => {
    const customFieldsJson = contact.customFields ?? "{}";
    const scriptContact = {
      firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "",
      cell: "",
      zip: contact.zip ?? "",
      customFields: customFieldsJson
    };
    const customFields = customFieldsJsonStringToArray(customFieldsJson);
    const campaignVariables = contact.campaignVariables ?? [];
    const texter = {
      firstName: profileData?.currentUser?.firstName ?? "",
      lastName: profileData?.currentUser?.lastName ?? ""
    };
    return (script: string) =>
      applyScript({
        script,
        contact: scriptContact,
        customFields,
        campaignVariables,
        texter
      });
  }, [
    contact.customFields,
    contact.firstName,
    contact.lastName,
    contact.zip,
    contact.campaignVariables,
    profileData
  ]);

  // responses: interactionStepId -> chosen answer value (for the question on
  // that step). Seed from any previously saved responses.
  const initialResponses = useMemo(() => {
    const seeded: Record<string, string> = {};
    (contact.questionResponseValues ?? []).forEach((qr) => {
      seeded[qr.interactionStepId] = qr.value;
    });
    return seeded;
  }, [contact.questionResponseValues]);

  const [responses, setResponses] = useState<Record<string, string>>(
    initialResponses
  );

  // path: step ids from root to the current step. Reconstruct how far the
  // saved responses get us so a re-dial resumes where it left off.
  const [path, setPath] = useState<string[]>(() => {
    if (!rootStep) return [];
    const walked = [rootStep.id];
    let current: InteractionStep | undefined = rootStep;
    while (current && initialResponses[current.id]) {
      const step: InteractionStep = current;
      const chosen: InteractionStep | undefined = childrenOf(step.id).find(
        (child) => child.answerOption === initialResponses[step.id]
      );
      if (!chosen) break;
      walked.push(chosen.id);
      current = chosen;
    }
    return walked;
  });

  const [
    initiateCall,
    { loading: initiating, error: initiateError }
  ] = useInitiateCallMutation();
  const [updateDialerCall] = useUpdateDialerCallMutation();
  const [saveQuestionResponses] = useSaveDialerQuestionResponsesMutation();
  const [
    markComplete,
    { loading: completing }
  ] = useMarkDialerContactCompleteMutation();
  const [tagContact, { loading: tagging }] = useTagDialerContactMutation();

  // Record the real telephony result + timing on the dialer_call exactly once
  // when the call ends, whether the volunteer hung up or the call ended on its
  // own (no answer, busy, remote hangup).
  const endRecordedRef = useRef(false);
  useEffect(() => {
    if (callState === "ended" && dialerCallId && !endRecordedRef.current) {
      endRecordedRef.current = true;
      setShowDisposition(true);
      updateDialerCall({
        variables: {
          dialerCallId,
          status: deriveCallStatus(callWasAnswered, callEndCause),
          answeredAt: callStartedAt
            ? new Date(callStartedAt).toISOString()
            : null,
          endedAt: callEndedAt ? new Date(callEndedAt).toISOString() : null
        }
      });
    }
  }, [
    callState,
    dialerCallId,
    callWasAnswered,
    callEndCause,
    callStartedAt,
    callEndedAt,
    updateDialerCall
  ]);

  const handleDial = useCallback(async () => {
    try {
      const { data } = await initiateCall({
        variables: { assignmentId, dialerCampaignContactId: contact.id }
      });
      if (!data?.initiateCall) return;
      const {
        dialerCallId: callId,
        contactPhone,
        fromNumber
      } = data.initiateCall;
      setDialerCallId(String(callId));
      dial(contactPhone, fromNumber);
    } catch (_err) {
      // error surfaced via mutation result
    }
  }, [assignmentId, contact.id, dial, initiateCall]);

  // Just end the call; the call-end effect records the real outcome + timing
  // and surfaces the disposition form.
  const handleHangup = useCallback(() => {
    hangup();
  }, [hangup]);

  // Record the answer for the current step and advance to the chosen child.
  const handleSelectAnswer = useCallback(
    (stepId: string, answer: string, childId: string) => {
      setResponses((prev) => ({ ...prev, [stepId]: answer }));
      setPath((prev) => [...prev, childId]);
    },
    []
  );

  // Drop a canned response into the script as a bubble for the volunteer to
  // read aloud. Stored raw and interpolated at render, like the script bubbles.
  const handleInsertCannedResponse = useCallback((text: string) => {
    insertedResponseIdRef.current += 1;
    setInsertedResponses((prev) => [
      ...prev,
      { id: insertedResponseIdRef.current, text }
    ]);
  }, []);

  // Click an inserted canned response to undo it (mirrors clicking an answer
  // bubble to revise it). Removal is trivially reversible — just re-pick it —
  // so it skips the confirm dialog the answer rewind uses.
  const handleRemoveCannedResponse = useCallback((id: number) => {
    setInsertedResponses((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Apply the tag changes from the dialog. The mutation returns the contact's
  // updated tag set, which Apollo merges into the cache so the chips refresh.
  const handleApplyTags = useCallback(
    async (addedTagIds: string[], removedTagIds: string[]) => {
      if (addedTagIds.length > 0 || removedTagIds.length > 0) {
        await tagContact({
          variables: {
            dialerCampaignContactId: contact.id,
            tag: { addedTagIds, removedTagIds }
          }
        });
      }
      setIsTagDialogOpen(false);
    },
    [contact.id, tagContact]
  );

  // Truncate the path back to `index` and clear answers for everything from
  // there onward so they don't get saved as stale responses.
  const handleJumpTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= path.length - 1) return;
      const discarded = path.slice(index);
      setResponses((prev) => {
        const next = { ...prev };
        discarded.forEach((id) => delete next[id]);
        return next;
      });
      setPath(path.slice(0, index + 1));
    },
    [path]
  );

  const confirmRewind = useCallback(() => {
    if (pendingRewindIndex !== null) {
      handleJumpTo(pendingRewindIndex);
    }
    setPendingRewindIndex(null);
  }, [handleJumpTo, pendingRewindIndex]);

  const handleDispositionSubmit = useCallback(
    async (disposition: Disposition) => {
      const questionResponses = Object.entries(
        responses
      ).map(([interactionStepId, value]) => ({ interactionStepId, value }));

      if (questionResponses.length > 0) {
        await saveQuestionResponses({
          variables: {
            dialerCampaignContactId: contact.id,
            questionResponses
          }
        });
      }

      await markComplete({
        variables: {
          dialerCampaignContactId: contact.id,
          callStatus: disposition
        }
      });

      if (dialerCallId) {
        await updateDialerCall({
          variables: {
            dialerCallId,
            status: dispositionToStatus[disposition]
          }
        });
      }

      onNextContact();
    },
    [
      contact.id,
      dialerCallId,
      markComplete,
      onNextContact,
      responses,
      saveQuestionResponses,
      updateDialerCall
    ]
  );

  const currentStepId = path[path.length - 1];
  const currentStep = currentStepId ? stepById.get(currentStepId) : undefined;
  const currentAnswers = currentStepId ? childrenOf(currentStepId) : [];
  const currentQuestion =
    currentStep?.questionText || currentStep?.question?.text || "";

  return (
    <Paper className={classes.root} elevation={2}>
      <div className={classes.header}>
        <Typography className={classes.name} variant="h5">
          {contact.firstName}
        </Typography>
        {contact.zip && (
          <Typography color="textSecondary" variant="body2">
            ZIP: {contact.zip}
          </Typography>
        )}
        <div className={classes.tags}>
          {contact.tags.map((tag) => (
            <Chip
              key={tag.id}
              className={classes.tagChip}
              label={tag.title}
              size="small"
              style={{
                backgroundColor: tag.backgroundColor,
                color: tag.textColor
              }}
            />
          ))}
          <Button
            color="primary"
            size="small"
            onClick={() => setIsTagDialogOpen(true)}
          >
            Manage Tags
          </Button>
        </div>
      </div>

      <Divider className={classes.section} />

      {(webRTCError || initiateError) && (
        <Typography color="error" variant="body2" className={classes.section}>
          {webRTCError ?? initiateError?.message}
        </Typography>
      )}

      <div className={classes.section}>
        <CallStatusBar
          callState={showDisposition ? "ended" : callState}
          callStartedAt={callStartedAt}
          callEndedAt={callEndedAt}
        />
        {!showDisposition && (
          <CallControls
            callState={callState}
            clientReady={clientReady}
            isMuted={isMuted}
            isSubmitting={initiating}
            onDial={handleDial}
            onHangup={handleHangup}
            onToggleMute={toggleMute}
          />
        )}
      </div>

      {(currentStep || insertedResponses.length > 0) && (
        <div className={classes.section}>
          <div className={classes.transcript}>
            {path.map((stepId, index) => {
              const script = interpolate(scriptByStep[stepId] ?? "");
              const answer = responses[stepId];
              return (
                <React.Fragment key={stepId}>
                  {script && (
                    <div className={`${classes.row} ${classes.rowLeft}`}>
                      <div
                        className={`${classes.bubble} ${classes.scriptBubble}`}
                      >
                        <Typography variant="body1">{script}</Typography>
                      </div>
                    </div>
                  )}
                  {answer !== undefined && (
                    <div className={`${classes.row} ${classes.rowRight}`}>
                      <ButtonBase
                        className={`${classes.bubble} ${classes.answerBubble}`}
                        onClick={() => setPendingRewindIndex(index)}
                      >
                        <Typography variant="body1">{answer}</Typography>
                      </ButtonBase>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {insertedResponses.map((inserted) => (
              <div
                key={inserted.id}
                className={`${classes.row} ${classes.rowRight}`}
              >
                <ButtonBase
                  className={`${classes.bubble} ${classes.answerBubble}`}
                  onClick={() => handleRemoveCannedResponse(inserted.id)}
                >
                  <Typography variant="body1">
                    {interpolate(inserted.text)}
                  </Typography>
                </ButtonBase>
              </div>
            ))}
          </div>

          {currentStep &&
            (currentAnswers.length > 0 ? (
              <>
                {currentQuestion && (
                  <Typography
                    className={classes.question}
                    variant="subtitle2"
                    color="textSecondary"
                    align="right"
                    style={{ marginTop: 16 }}
                  >
                    {currentQuestion}
                  </Typography>
                )}
                <div className={classes.answers}>
                  {currentAnswers.map((answer) => (
                    <Button
                      key={answer.id}
                      className={classes.answerButton}
                      variant="outlined"
                      color="primary"
                      onClick={() =>
                        handleSelectAnswer(
                          currentStepId,
                          answer.answerOption ?? "",
                          answer.id
                        )
                      }
                    >
                      {answer.answerOption}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <Typography className={classes.endNote} variant="body2">
                End of script.
              </Typography>
            ))}
        </div>
      )}

      <div className={classes.section}>
        <CannedResponses
          assignmentId={assignmentId}
          interpolate={interpolate}
          onSelect={handleInsertCannedResponse}
        />
      </div>

      <Dialog
        open={pendingRewindIndex !== null}
        onClose={() => setPendingRewindIndex(null)}
      >
        <DialogTitle>Change this answer?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will clear your answers from this question onward.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRewindIndex(null)}>Cancel</Button>
          <Button color="primary" onClick={confirmRewind}>
            Change
          </Button>
        </DialogActions>
      </Dialog>

      {showDisposition && (
        <DispositionForm
          onSubmit={handleDispositionSubmit}
          isSubmitting={completing}
          initialDisposition={deriveDisposition(callWasAnswered, callEndCause)}
        />
      )}

      <TagDialog
        open={isTagDialogOpen}
        organizationId={organizationId}
        appliedTags={contact.tags}
        isSubmitting={tagging}
        onClose={() => setIsTagDialogOpen(false)}
        onApply={handleApplyTags}
      />
    </Paper>
  );
};

export default DialerContact;
