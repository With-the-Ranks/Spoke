import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import type { FetchCampaignOverlapsQuery } from "@spoke/spoke-codegen";
import {
  useDeleteManyCampaignOverlapMutation,
  useFetchCampaignOverlapsQuery
} from "@spoke/spoke-codegen";
import DataTable from "material-ui-datatables";
import Toggle from "material-ui/Toggle";
import React, { useState } from "react";

import LoadingIndicator from "../../../components/LoadingIndicator";
import { DateTime } from "../../../lib/datetime";
import { PrettyErrors } from "../../hoc/with-operations";
import CampaignFormSectionHeading from "../components/CampaignFormSectionHeading";
import type { FullComponentProps } from "../components/SectionWrapper";
import { asSection } from "../components/SectionWrapper";

const ROW_SIZE_OPTIONS = [25, 50, 100];

type OverlapResult = NonNullable<
  FetchCampaignOverlapsQuery["fetchCampaignOverlaps"][number]
>;

interface OverlapRow {
  campaignId: string;
  campaignTitle: string;
  overlapCount: number;
  lastActivity: string;
}

const toRow = (overlap: OverlapResult): OverlapRow => ({
  campaignId: overlap.campaign.id,
  campaignTitle: overlap.campaign.title,
  overlapCount: overlap.overlapCount,
  lastActivity: DateTime.fromISO(overlap.lastActivity).toRelative() ?? ""
});

const renderCampaignTitle = (
  title: string,
  id: string,
  deleting: Set<string>,
  deleted: Set<string>
) =>
  deleting.has(id) ? (
    <span>
      {title} <LoadingIndicator />
    </span>
  ) : deleted.has(id) ? (
    <span>
      <del> {title} </del>
    </span>
  ) : (
    <span> {title} </span>
  );

const CampaignOverlapManager: React.FC<FullComponentProps> = (props) => {
  const { campaignId, organizationId, onError } = props;

  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(
    new Set()
  );
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(ROW_SIZE_OPTIONS[0]);
  const [search, setSearch] = useState("");

  const { data, loading, error } = useFetchCampaignOverlapsQuery({
    variables: {
      input: { targetCampaignId: campaignId, includeArchived }
    }
  });

  const [deleteOverlap] = useDeleteManyCampaignOverlapMutation();

  if (loading && !data) return <CircularProgress />;
  if (error || !data) return <PrettyErrors errors={error ? [error] : []} />;

  const overlaps = data.fetchCampaignOverlaps.filter(
    (overlap): overlap is OverlapResult => overlap != null
  );

  const searchedOverlaps = search
    ? overlaps.filter((overlap) => overlap.campaign.title.match(search))
    : overlaps;

  const pageStart = page * pageSize;
  const pageEnd = pageStart + pageSize;
  const currentOverlapPage = searchedOverlaps
    .slice(pageStart, pageEnd)
    .map(toRow);

  const selectedRows = currentOverlapPage.flatMap((row, idx) =>
    selectedCampaignIds.has(row.campaignId) ? [idx] : []
  );

  const isDeleteAllDisabled =
    selectedCampaignIds.size === 0 || deleting.size > 0;

  const handleRowsSelected = (rows: "all" | "none" | number[]) => {
    const newSelectedCampaignIds = new Set(selectedCampaignIds);

    if (rows === "all") {
      currentOverlapPage.forEach((row) => {
        if (!deleted.has(row.campaignId)) {
          newSelectedCampaignIds.add(row.campaignId);
        }
      });
    } else if (rows === "none") {
      currentOverlapPage.forEach((row) =>
        newSelectedCampaignIds.delete(row.campaignId)
      );
    } else {
      currentOverlapPage.forEach((row, idx) => {
        if (rows.includes(idx)) {
          if (!deleted.has(row.campaignId)) {
            newSelectedCampaignIds.add(row.campaignId);
          }
        } else {
          newSelectedCampaignIds.delete(row.campaignId);
        }
      });
    }

    setSelectedCampaignIds(newSelectedCampaignIds);
  };

  const handleRowSizeChange = (rowSizeIdx: number) => {
    setPageSize(ROW_SIZE_OPTIONS[rowSizeIdx]);
  };

  const renderCampaignTitleColumn = (
    title: string,
    { campaignId: id }: OverlapRow
  ) => renderCampaignTitle(title, id, deleting, deleted);

  const handleDeleteAllSelected = async () => {
    const idsToDelete = [...selectedCampaignIds];
    setDeleting(new Set(idsToDelete));
    setSelectedCampaignIds(new Set());

    try {
      const response = await deleteOverlap({
        variables: {
          organizationId,
          campaignId,
          overlappingCampaignIds: idsToDelete
        }
      });

      if (response.errors) {
        throw new Error(response.errors.map((err) => `${err}`).join("\n"));
      }

      setDeleted(new Set([...deleted, ...idsToDelete]));
    } catch (err: any) {
      onError(err.message);
    } finally {
      setDeleting(new Set());
    }
  };

  return (
    <div>
      <CampaignFormSectionHeading
        title="Contact Overlap Management"
        subtitle="Find campaigns whose contacts overlap with this one, and optionally delete the overlapping contacts from those other campaigns."
      />
      <Toggle
        label="Include archived campaigns"
        toggled={includeArchived}
        onToggle={(_e: unknown, newIncludeArchived: boolean) =>
          setIncludeArchived(newIncludeArchived)
        }
      />
      <div style={{ display: "flex", alignItems: "center" }}>
        <p>
          Warning: clicking the trashcan will trigger an irreversible delete.
        </p>
        <div style={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          color="secondary"
          disabled={isDeleteAllDisabled}
          onClick={handleDeleteAllSelected}
        >
          {deleting.size > 0
            ? "Deleting..."
            : isDeleteAllDisabled
            ? "Delete Selected"
            : `Delete ${selectedCampaignIds.size} Selected`}
        </Button>
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Search for campaigns"
        onChange={(e) => setSearch(e.target.value)}
      />
      <DataTable
        multiSelectable
        selectable
        enableSelectAll
        showCheckboxes
        data={currentOverlapPage}
        page={page + 1}
        count={searchedOverlaps.length}
        selectedRows={selectedRows}
        onRowSelection={handleRowsSelected}
        onRowSizeChange={handleRowSizeChange}
        rowSize={pageSize}
        rowSizeList={ROW_SIZE_OPTIONS}
        onNextPageClick={() => setPage(page + 1)}
        onPreviousPageClick={() => setPage(Math.max(page - 1, 0))}
        columns={[
          {
            key: "overlapCount",
            label: "Overlap Count",
            style: { width: 50 }
          },
          { key: "campaignId", label: "ID", style: { width: 30 } },
          {
            key: "lastActivity",
            label: "Last Messaged",
            style: { width: 50 }
          },
          {
            key: "campaignTitle",
            label: "Title",
            render: renderCampaignTitleColumn
          }
        ]}
      />
    </div>
  );
};

export default asSection({
  title: "Contact Overlap Management",
  jobQueueNames: [],
  expandAfterCampaignStarts: true,
  expandableBySuperVolunteers: false
})(CampaignOverlapManager);
