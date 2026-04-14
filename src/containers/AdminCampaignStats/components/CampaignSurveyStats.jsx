import { gql } from "@apollo/client";
import { css, StyleSheet } from "aphrodite";
import PropTypes from "prop-types";
import React from "react";

import theme from "../../../styles/theme";
import { loadData } from "../../hoc/with-operations";
import CampaignStat from "./CampaignStat";
import Chart from "./Chart";

const styles = StyleSheet.create({
  container: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: "24px",
    flexWrap: "wrap"
  },
  secondaryHeader: {
    ...theme.text.secondaryHeader
  }
});

const CampaignSurveyStats = (props) => {
  const { interactionSteps } = props.data.campaign;

  return (
    <div>
      {interactionSteps
        .filter((iStep) => iStep.question.text !== "")
        .map((step) => {
          const { answerOptions } = step.question;
          const countReducer = (acc, answer) => acc + answer.responderCount;
          const responseCount = answerOptions.reduce(countReducer, 0);

          return (
            <div key={step.id} style={{ marginBottom: 48 }}>
              <div
                className={css(styles.secondaryHeader)}
                style={{ marginBottom: 16 }}
              >
                {step.question.text}
              </div>
              {responseCount > 0 ? (
                <div className={css(styles.container)}>
                  <CampaignStat title="responses" count={responseCount} />
                  <Chart
                    data={step.question.answerOptions.map((answer) => [
                      answer.value,
                      answer.responderCount
                    ])}
                  />
                </div>
              ) : (
                "No responses yet"
              )}
            </div>
          );
        })}
    </div>
  );
};

CampaignSurveyStats.propTypes = {
  campaignId: PropTypes.string.isRequired
};

const queries = {
  data: {
    query: gql`
      query getCampaign($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          interactionSteps {
            id
            question {
              text
              answerOptions {
                value
                responderCount
              }
            }
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  }
};

export default loadData({ queries })(CampaignSurveyStats);
