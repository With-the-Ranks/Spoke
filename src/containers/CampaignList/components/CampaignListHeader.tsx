import { InputAdornment, makeStyles } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import TextField from "@material-ui/core/TextField";
import LibraryAddCheckOutlinedIcon from "@material-ui/icons/LibraryAddCheckOutlined";
import OpenInNewOutlinedIcon from "@material-ui/icons/OpenInNewOutlined";
import SearchIcon from "@material-ui/icons/Search";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

import type { CampaignDetailsForExport } from "../../../components/ExportMultipleCampaignDataDialog";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    paddingTop: 16
  },
  exportButton: {
    alignSelf: "flex-start",
    margin: "16px 0 8px"
  },
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 8
  }
});

const DEBOUNCE_INTERVAL = 500;

const FILTER_CHIPS = [
  {
    label: "Archived",
    field: "isArchived",
    activeValue: true,
    inactiveValue: false
  },
  {
    label: "Started",
    field: "isStarted",
    activeValue: true,
    inactiveValue: undefined
  },
  {
    label: "Not Started",
    field: "isStarted",
    activeValue: false,
    inactiveValue: undefined
  },
  {
    label: "Unsent Initials",
    field: "hasUnsentInitialMessages",
    activeValue: true,
    inactiveValue: undefined
  },
  {
    label: "Unhandled Replies",
    field: "hasUnhandledMessages",
    activeValue: true,
    inactiveValue: undefined
  },
  {
    label: "Unassigned Contacts",
    field: "hasUnassignedContacts",
    activeValue: true,
    inactiveValue: undefined
  }
];

interface Props {
  campaignDetailsForExport: CampaignDetailsForExport[];
  campaignsFilter: Record<string, unknown>;
  filterByCampaignTitle: (str: string) => void;
  onChipToggle: (
    field: string,
    activeValue: unknown,
    inactiveValue: unknown
  ) => void;
  onClick: () => void;
}

const CampaignListHeader: React.FC<Props> = ({
  campaignDetailsForExport,
  campaignsFilter,
  onClick,
  filterByCampaignTitle,
  onChipToggle
}) => {
  const classes = useStyles();
  const debounceSearchTerm = useDebouncedCallback((str: string) => {
    filterByCampaignTitle(str);
  }, DEBOUNCE_INTERVAL);

  const campaignIds = campaignDetailsForExport.map((campaign) => campaign.id);
  const isCampaignSelected = campaignIds.length > 0;

  return (
    <div className={classes.wrapper}>
      <Button
        aria-controls="simple-menu"
        aria-haspopup="true"
        onClick={onClick}
        variant="outlined"
        color="primary"
        className={classes.exportButton}
        startIcon={
          isCampaignSelected ? (
            <OpenInNewOutlinedIcon />
          ) : (
            <LibraryAddCheckOutlinedIcon />
          )
        }
        disabled={!isCampaignSelected}
      >
        {isCampaignSelected
          ? `Export ${campaignIds.length} Campaign(s)`
          : "Select Campaign(s)"}
      </Button>
      <div className={classes.filterRow}>
        {FILTER_CHIPS.map(({ label, field, activeValue, inactiveValue }) => {
          const isActive = campaignsFilter[field] === activeValue;
          return (
            <Chip
              key={label}
              label={label}
              clickable
              color={isActive ? "primary" : "default"}
              variant={isActive ? "default" : "outlined"}
              onClick={() => onChipToggle(field, activeValue, inactiveValue)}
            />
          );
        })}
        <TextField
          id="outlined-basic"
          label="Search..."
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          onChange={(ev) => debounceSearchTerm(ev.target.value)}
        />
      </div>
    </div>
  );
};

export default CampaignListHeader;
