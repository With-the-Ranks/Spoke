import { gql } from "@apollo/client";
import { Grid } from "@material-ui/core";
import type { Campaign } from "@spoke/spoke-codegen";
import { css, StyleSheet } from "aphrodite";
import PropTypes from "prop-types";
import React from "react";

import errorCodeDescriptions from "../../../lib/telco-error-codes";
import { asPercent, asPercentWithTotal } from "../../../lib/utils";
import theme from "../../../styles/theme";
import { loadData } from "../../hoc/with-operations";
import CampaignStat from "./CampaignStat";

const styles = StyleSheet.create({
  secondaryHeader: {
    ...theme.text.secondaryHeader
  }
});

const DeliverabilityStats = (props: {
  data: {
    campaign: Pick<Campaign, "id" | "deliverabilityStats">;
  };
}) => {
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
        className={css(styles.secondaryHeader)}
        style={{ marginTop: 24, marginBottom: 8 }}
      >
        Top errors:
      </div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
            {["Error ID", "Error Label", "Percentage", "Number of Errors"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 12px",
                    fontWeight: 600,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    fontSize: 11,
                    letterSpacing: "0.05em"
                  }}
                >
                  {h}
                </th>
              )
            )}
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
                <tr
                  key={errorCode}
                  style={{ borderBottom: "1px solid #F3F4F6" }}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {errorCode}
                  </td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>
                    {description}
                  </td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>
                    {pct}
                  </td>
                  <td style={{ padding: "8px 12px", color: "#374151" }}>
                    {e.count}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
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
