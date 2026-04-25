import { gql } from "@apollo/client";
import { Grid, Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import type { Campaign } from "@spoke/spoke-codegen";
import PropTypes from "prop-types";
import React from "react";

import errorCodeDescriptions from "../../../lib/telco-error-codes";
import { asPercent, asPercentWithTotal } from "../../../lib/utils";
import theme from "../../../styles/theme";
import { loadData } from "../../hoc/with-operations";
import CampaignStat from "./CampaignStat";

const useStyles = makeStyles({
  secondaryHeader: {
    ...theme.text.secondaryHeader
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13
  },
  headerRow: {
    borderBottom: "1px solid #E5E7EB"
  },
  headerCell: {
    textAlign: "left" as const,
    padding: "6px 12px",
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase" as const,
    fontSize: 11,
    letterSpacing: "0.05em"
  },
  bodyRow: {
    borderBottom: "1px solid #F3F4F6"
  },
  cellBold: {
    padding: "8px 12px",
    fontWeight: 600
  },
  cell: {
    padding: "8px 12px",
    color: "#374151"
  }
});

const ERROR_TABLE_HEADERS = [
  "Error ID",
  "Error Label",
  "Percentage",
  "Number of Errors"
];

const DeliverabilityStats = (props: {
  data: {
    campaign: Pick<Campaign, "id" | "deliverabilityStats">;
  };
}) => {
  const classes = useStyles();
  const {
    data: {
      campaign: {
        deliverabilityStats: {
          deliveredCount,
          sendingCount,
          sentCount,
          errorCount,
          specificErrors
        }
      }
    }
  } = props;

  const total = deliveredCount + sendingCount + sentCount + errorCount;

  const highErrorPercent = 25;
  const campaignErrorPercent = asPercent(errorCount, total);
  const errorHighlight = campaignErrorPercent > highErrorPercent;

  return (
    <div>
      <Grid container spacing={2} justifyContent="center">
        <Grid item xs={4}>
          <CampaignStat
            title="Delivered"
            count={asPercentWithTotal(deliveredCount, total)}
          />
        </Grid>
        <Grid item xs={4}>
          <CampaignStat
            title="Sending"
            count={asPercentWithTotal(sendingCount + sentCount, total)}
          />
        </Grid>
        <Grid item xs={4}>
          <CampaignStat
            title="Error"
            count={asPercentWithTotal(errorCount, total)}
            highlight={errorHighlight}
          />
        </Grid>
      </Grid>

      <div
        className={classes.secondaryHeader}
        style={{ marginTop: 24, marginBottom: 8 }}
      >
        Top errors:
      </div>
      <Paper variant="outlined" style={{ padding: 16 }}>
        <table className={classes.table}>
          <thead>
            <tr className={classes.headerRow}>
              {ERROR_TABLE_HEADERS.map((h) => (
                <th key={h} className={classes.headerCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...specificErrors]
              .sort((a, b) => b.count - a.count)
              .map((e) => {
                const errorCode = e.errorCode ? `${e.errorCode}` : "n/a";
                const description =
                  errorCodeDescriptions[errorCode] || "Unknown error";
                const pct = `${((e.count / total) * 100).toFixed(2)}%`;
                return (
                  <tr key={errorCode} className={classes.bodyRow}>
                    <td className={classes.cellBold}>{errorCode}</td>
                    <td className={classes.cell}>{description}</td>
                    <td className={classes.cell}>{pct}</td>
                    <td className={classes.cell}>{e.count}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Paper>
    </div>
  );
};

DeliverabilityStats.propTypes = {
  campaignId: PropTypes.string.isRequired
};

const queries = {
  data: {
    query: gql`
      query getDeliverabilityStats($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          deliverabilityStats {
            deliveredCount
            sendingCount
            sentCount
            errorCount
            specificErrors {
              errorCode
              count
            }
          }
        }
      }
    `,
    options: (ownProps: { campaignId: string }) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  }
};

export default loadData({ queries })(DeliverabilityStats);
