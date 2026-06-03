import { Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import React from "react";

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  campaignId: {
    color: "#666666"
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8
  },
  statusCell: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    borderRadius: 4
  },
  statusCellSuccess: {
    backgroundColor: "#DFF0DF"
  },
  statusCellError: {
    backgroundColor: "#FFF2E9"
  },
  iconSuccess: {
    color: "#4caf50",
    flexShrink: 0
  },
  iconError: {
    color: "#FF781D",
    flexShrink: 0
  },
  statusLabel: {
    fontSize: "0.8rem",
    lineHeight: 1.2
  }
});

export type Tag = {
  title: string;
  status: string;
};

interface CampaignHeaderProps {
  campaignTitle: string;
  campaignId: string;
  tags: Tag[];
}

const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaignTitle,
  campaignId,
  tags
}) => {
  const classes = useStyles();
  return (
    <div className={classes.wrapper}>
      <div className={classes.titleRow}>
        <Typography variant="h6">{campaignTitle}</Typography>
        <Typography variant="subtitle1" className={classes.campaignId}>
          ID: {campaignId}
        </Typography>
      </div>
      <div className={classes.statusGrid}>
        {tags.map((tag) => {
          const isSuccess = tag.status === "success";
          return (
            <div
              key={tag.title}
              className={`${classes.statusCell} ${
                isSuccess ? classes.statusCellSuccess : classes.statusCellError
              }`}
            >
              {isSuccess ? (
                <CheckCircleIcon
                  fontSize="small"
                  className={classes.iconSuccess}
                />
              ) : (
                <ErrorIcon fontSize="small" className={classes.iconError} />
              )}
              <Typography className={classes.statusLabel}>
                {tag.title}
              </Typography>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignHeader;
