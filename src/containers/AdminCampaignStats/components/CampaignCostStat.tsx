import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useState } from "react";

import CampaignStat from "./CampaignStat";

const useStyles = makeStyles((theme) => ({
  clickable: {
    cursor: "pointer",
    height: "100%"
  },
  breakdown: {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: theme.spacing(1, 3),
    marginBottom: theme.spacing(2)
  },
  total: {
    fontWeight: 700
  }
}));

const formatUsd = (amount: number, maximumFractionDigits = 2) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits
  }).format(amount);

interface CampaignCostStatProps {
  loading?: boolean;
  error?: string;
  smsSegments?: number;
  mmsMessages?: number;
}

export const CampaignCostStat: React.FC<CampaignCostStatProps> = ({
  loading,
  error,
  smsSegments,
  mmsMessages
}) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const smsCost = (smsSegments ?? 0) * window.SMS_SEGMENT_COST;
  const mmsCost = (mmsMessages ?? 0) * window.MMS_MESSAGE_COST;
  const estimatedCost = smsCost + mmsCost;
  const hasStats = smsSegments !== undefined && mmsMessages !== undefined;
  const openDialog = () => setOpen(true);

  return (
    <>
      <div
        className={hasStats ? classes.clickable : undefined}
        onClick={hasStats ? openDialog : undefined}
        onKeyDown={
          hasStats
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDialog();
                }
              }
            : undefined
        }
        role={hasStats ? "button" : undefined}
        tabIndex={hasStats ? 0 : undefined}
      >
        <CampaignStat
          title="Estimated Campaign Cost"
          loading={loading}
          error={error}
          count={hasStats ? formatUsd(estimatedCost) : undefined}
        />
      </div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Estimated Campaign Cost</DialogTitle>
        <DialogContent>
          <div className={classes.breakdown}>
            <Typography>SMS segments</Typography>
            <Typography>
              {smsSegments} × {formatUsd(window.SMS_SEGMENT_COST, 4)}
            </Typography>
            <Typography>{formatUsd(smsCost)}</Typography>
            <Typography>MMS messages</Typography>
            <Typography>
              {mmsMessages} × {formatUsd(window.MMS_MESSAGE_COST, 4)}
            </Typography>
            <Typography>{formatUsd(mmsCost)}</Typography>
            <Typography className={classes.total}>Estimated total</Typography>
            <span />
            <Typography className={classes.total}>
              {formatUsd(estimatedCost)}
            </Typography>
          </div>
          <DialogContentText>
            This estimate is based on the campaign's current SMS and MMS usage.
            Final billing costs may vary.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CampaignCostStat;
