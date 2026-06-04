import { InputAdornment, makeStyles } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import Chip from "@material-ui/core/Chip";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import TextField from "@material-ui/core/TextField";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import FilterListIcon from "@material-ui/icons/FilterList";
import LibraryAddCheckOutlinedIcon from "@material-ui/icons/LibraryAddCheckOutlined";
import OpenInNewOutlinedIcon from "@material-ui/icons/OpenInNewOutlined";
import SearchIcon from "@material-ui/icons/Search";
import React, { useState } from "react";
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
    flexWrap: "wrap",
    gap: 8
  },
  filterButton: {
    whiteSpace: "nowrap"
  },
  activeChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  searchField: {
    marginLeft: "auto"
  }
});

const DEBOUNCE_INTERVAL = 500;

interface FilterChip {
  label: string;
  field: string;
  activeValue: boolean;
  inactiveValue: boolean | undefined;
}

interface FilterGroup {
  label: string;
  chips: FilterChip[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "Campaign status",
    chips: [
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
      }
    ]
  },
  {
    label: "Message status",
    chips: [
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
    ]
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const debounceSearchTerm = useDebouncedCallback((str: string) => {
    filterByCampaignTitle(str);
  }, DEBOUNCE_INTERVAL);

  const campaignIds = campaignDetailsForExport.map((campaign) => campaign.id);
  const isCampaignSelected = campaignIds.length > 0;

  const isChipActive = (chip: FilterChip) =>
    campaignsFilter[chip.field] === chip.activeValue;

  const activeChips = FILTER_GROUPS.flatMap((group) => group.chips).filter(
    isChipActive
  );

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) =>
    setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

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
        <Button
          aria-controls="campaign-filter-menu"
          aria-haspopup="true"
          variant="outlined"
          className={classes.filterButton}
          startIcon={<FilterListIcon />}
          endIcon={<ArrowDropDownIcon />}
          onClick={handleOpenMenu}
        >
          {activeChips.length > 0 ? `Filter (${activeChips.length})` : "Filter"}
        </Button>
        <Menu
          id="campaign-filter-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          getContentAnchorEl={null}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          {FILTER_GROUPS.flatMap((group) => [
            <ListSubheader key={`${group.label}-header`} disableSticky>
              {group.label}
            </ListSubheader>,
            ...group.chips.map((chip) => (
              <MenuItem
                key={chip.label}
                onClick={() =>
                  onChipToggle(chip.field, chip.activeValue, chip.inactiveValue)
                }
              >
                <Checkbox edge="start" checked={isChipActive(chip)} />
                <ListItemText primary={chip.label} />
              </MenuItem>
            ))
          ])}
        </Menu>
        <div className={classes.activeChips}>
          {activeChips.map((chip) => (
            <Chip
              key={chip.label}
              label={chip.label}
              color="primary"
              onDelete={() =>
                onChipToggle(chip.field, chip.activeValue, chip.inactiveValue)
              }
            />
          ))}
        </div>
        <TextField
          id="outlined-basic"
          label="Search..."
          variant="outlined"
          size="small"
          className={classes.searchField}
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
