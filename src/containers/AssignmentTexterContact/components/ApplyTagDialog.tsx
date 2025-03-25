import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import type {
  CampaignContact,
  ContactTagInfoFragment,
  Tag,
  TagInfoFragment,
  User
} from "@spoke/spoke-codegen";
import { useGetContactTagsQuery } from "@spoke/spoke-codegen";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import TagSelector from "../../../components/TagSelector";
import { DateTime } from "../../../lib/datetime";
import theme from "../../../styles/theme";
import ApplyTagConfirmationDialog from "./ApplyTagConfirmationDialog";

export interface ApplyTagDialogProps {
  open: boolean;
  allTags: TagInfoFragment[];
  onRequestClose: () => Promise<void> | void;
  onApplyTag: (
    addedTags: ContactTagInfoFragment[],
    removedTags: ContactTagInfoFragment[]
  ) => Promise<void> | void;
  onApplyTagsAndMoveOn: (
    addedTags: ContactTagInfoFragment[],
    removedTags: ContactTagInfoFragment[]
  ) => Promise<void> | void;
  texter: User;
  contact: Omit<CampaignContact, "tags">;
}

const ApplyTagDialog: React.FC<ApplyTagDialogProps> = ({
  open,
  allTags,
  onRequestClose,
  onApplyTag,
  onApplyTagsAndMoveOn,
  texter,
  contact
}: ApplyTagDialogProps) => {
  const { t: i18t } = useTranslation("ApplyTagDialog");

  const { data } = useGetContactTagsQuery({
    variables: { contactId: contact.id }
  });
  const contactTags = data?.contact?.tags ?? [];
  const contactTagsTags = contactTags.map((t) => t.tag);

  const [selectedContactTags, setSelectedContactTags] = useState<
    TagInfoFragment[]
  >(contactTagsTags);
  const [pendingTag, setPendingTag] = useState<TagInfoFragment | undefined>(
    undefined
  );
  useEffect(() => {
    if (open) {
      setSelectedContactTags([...contactTagsTags]);
    }
  }, [open]);

  const addToSelectedTags = (addedTag: TagInfoFragment) => {
    setSelectedContactTags([...selectedContactTags, addedTag]);
  };

  const isEscalateTag = (tag: TagInfoFragment) =>
    tag.title === "Escalated" || tag.title === "Escalate";
  const isNonAssignableTagApplied = (appliedTags: TagInfoFragment[]) =>
    appliedTags.findIndex((t) => !t.isAssignable) > -1;

  const handleOnTagChange = (changedTags: TagInfoFragment[]) =>
    setSelectedContactTags(changedTags);

  const handleOnCancelEscalateTag = () => setPendingTag(undefined);

  const handleOnConfirmAddEscalatedTag = (escalateTag: TagInfoFragment) => {
    if (selectedContactTags.findIndex((t) => t.id === escalateTag.id) === -1) {
      addToSelectedTags(escalateTag);
    }
    setPendingTag(undefined);
  };

  const handleAddEscalatedTag = () => {
    const escalateTag = allTags.find(isEscalateTag);
    if (escalateTag !== undefined) {
      if (
        escalateTag.confirmationSteps &&
        escalateTag.confirmationSteps.length > 0
      ) {
        setPendingTag(escalateTag);
      } else {
        handleOnConfirmAddEscalatedTag(escalateTag);
      }
    }
  };

  const getTagsPayload = () => {
    const contactTagIds = new Set(contactTags.map((t) => t.tag.id));
    const selectedTagIds = new Set(selectedContactTags.map((t) => t.id));
    const addedTags = selectedContactTags
      .filter((t) => !contactTagIds.has(t.id))
      .map<ContactTagInfoFragment>((addedTag) => ({
        id: `${contact.id}-${addedTag.id}`,
        tag: addedTag as Tag,
        tagger: texter,
        createdAt: DateTime.local().toISO(),
        updatedAt: DateTime.local().toISO()
      }));
    const removedTags: ContactTagInfoFragment[] = contactTags.filter(
      (t) => !selectedTagIds.has(t.tag.id)
    );

    return { addedTags, removedTags };
  };

  const handleApplyTags = () => {
    const { addedTags, removedTags } = getTagsPayload();
    onApplyTag(addedTags, removedTags);
    setPendingTag(undefined);
  };

  const handleApplyTagsAndMoveOn = () => {
    const { addedTags, removedTags } = getTagsPayload();
    onApplyTagsAndMoveOn(addedTags, removedTags);
    setPendingTag(undefined);
  };

  const escalateTag = allTags.find(isEscalateTag);
  const tagsWithoutEscalated = allTags.filter((t) => !isEscalateTag(t));

  const hasNonAssignableTag = isNonAssignableTagApplied(selectedContactTags);

  const btnSaveWithoutMessage = (
    <Button
      key="save-without-message"
      color="primary"
      onClick={handleApplyTagsAndMoveOn}
    >
      {i18t("save and move on")}
    </Button>
  );

  const btnSaveWithMessage = (
    <Button key="save-with-message" color="primary" onClick={handleApplyTags}>
      {i18t("save and type message")}
    </Button>
  );

  const saveActions = hasNonAssignableTag
    ? [btnSaveWithoutMessage]
    : [btnSaveWithMessage, btnSaveWithoutMessage];

  const selectTagActions = saveActions.concat([
    <Button key="save" color="primary" onClick={onRequestClose}>
      {i18t("cancel")}
    </Button>
  ]);

  return (
    <div id="applyTagDialog">
      <Dialog open={open} maxWidth="xl" fullWidth onClose={onRequestClose}>
        <DialogTitle>{i18t("more actions")}</DialogTitle>
        <DialogContent>
          {!!escalateTag && (
            <Button
              variant="contained"
              color="secondary"
              style={{ paddingLeft: 20, paddingRight: 20 }}
              onClick={handleAddEscalatedTag}
            >
              {i18t("escalate convo")}
            </Button>
          )}
          {hasNonAssignableTag ? (
            <p style={{ color: theme.colors.red }}>
              {i18t("non-assignable tag applied")}
            </p>
          ) : null}
          <TagSelector
            value={selectedContactTags}
            dataSource={tagsWithoutEscalated}
            onChange={handleOnTagChange}
          />
        </DialogContent>
        <DialogActions>{selectTagActions}</DialogActions>
      </Dialog>
      <ApplyTagConfirmationDialog
        pendingTag={pendingTag}
        onCancel={handleOnCancelEscalateTag}
        onConfirm={handleOnConfirmAddEscalatedTag}
      />
    </div>
  );
};

export default ApplyTagDialog;
