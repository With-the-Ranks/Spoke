import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import type { TagInfoFragment } from "@spoke/spoke-codegen";
import { useGetOrganizationTagsQuery } from "@spoke/spoke-codegen";
import React, { useEffect, useMemo, useState } from "react";

import TagSelector from "../../../components/TagSelector";

interface TagDialogProps {
  open: boolean;
  organizationId: string;
  // The contact's currently-applied tags (only ids are needed for the diff).
  appliedTags: Array<{ id: string }>;
  isSubmitting: boolean;
  onClose: () => void;
  onApply: (addedTagIds: string[], removedTagIds: string[]) => void;
}

const TagDialog: React.FC<TagDialogProps> = ({
  open,
  organizationId,
  appliedTags,
  isSubmitting,
  onClose,
  onApply
}) => {
  const { data } = useGetOrganizationTagsQuery({
    variables: { organizationId }
  });
  const orgTags = useMemo(() => data?.organization?.tagList ?? [], [data]);

  const appliedTagIds = useMemo(() => new Set(appliedTags.map((t) => t.id)), [
    appliedTags
  ]);

  const [selected, setSelected] = useState<TagInfoFragment[]>([]);

  // Seed the selection from the contact's current tags whenever the dialog
  // opens (or the tag list finishes loading).
  useEffect(() => {
    if (open) {
      setSelected(orgTags.filter((tag) => appliedTagIds.has(tag.id)));
    }
  }, [open, orgTags, appliedTagIds]);

  const handleSave = () => {
    const selectedIds = new Set(selected.map((tag) => tag.id));
    const addedTagIds = selected
      .filter((tag) => !appliedTagIds.has(tag.id))
      .map((tag) => tag.id);
    const removedTagIds = [...appliedTagIds].filter(
      (id) => !selectedIds.has(id)
    );
    onApply(addedTagIds, removedTagIds);
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
      <DialogTitle>Manage Tags</DialogTitle>
      <DialogContent>
        <TagSelector
          value={selected}
          dataSource={orgTags}
          onChange={setSelected}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" disabled={isSubmitting} onClick={handleSave}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TagDialog;
