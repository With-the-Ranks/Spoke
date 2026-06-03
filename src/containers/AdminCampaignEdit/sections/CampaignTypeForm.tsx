import type { ApolloQueryResult } from "@apollo/client";
import { gql } from "@apollo/client";
import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import React from "react";
import { compose } from "recompose";

import { loadData } from "../../hoc/with-operations";
import CampaignFormSectionHeading from "../components/CampaignFormSectionHeading";
import type {
  FullComponentProps,
  RequiredComponentProps
} from "../components/SectionWrapper";
import { asSection } from "../components/SectionWrapper";

type CampaignTypeValue = "SMS" | "CALL";

interface CampaignTypeFormValues {
  campaignType: CampaignTypeValue;
}

interface CampaignTypeHocProps {
  data: {
    campaign: CampaignTypeFormValues & { id: string; isStarted: boolean };
  };
  mutations: {
    editCampaign(payload: CampaignTypeFormValues): ApolloQueryResult<any>;
  };
}

interface CampaignTypeInnerProps
  extends FullComponentProps,
    CampaignTypeHocProps {}

interface CampaignTypeState {
  campaignType?: CampaignTypeValue;
  isWorking: boolean;
}

class CampaignTypeForm extends React.Component<
  CampaignTypeInnerProps,
  CampaignTypeState
> {
  state: CampaignTypeState = {
    campaignType: undefined,
    isWorking: false
  };

  handleChange = (
    _event: React.ChangeEvent<HTMLInputElement>,
    value: string
  ) => {
    this.setState({ campaignType: value as CampaignTypeValue });
  };

  handleSubmit = async () => {
    const { campaignType } = this.state;
    const { editCampaign } = this.props.mutations;

    this.setState({ isWorking: true });
    try {
      const response = await editCampaign({ campaignType: campaignType! });
      if (response.errors) throw response.errors;
      this.setState({ campaignType: undefined });
    } catch (err) {
      this.props.onError(err.message);
    } finally {
      this.setState({ isWorking: false });
    }
  };

  render() {
    const { isWorking } = this.state;
    const {
      data: { campaign },
      saveLabel
    } = this.props;

    const campaignType =
      this.state.campaignType !== undefined
        ? this.state.campaignType
        : campaign.campaignType;

    const hasPendingChanges =
      this.state.campaignType !== undefined &&
      this.state.campaignType !== campaign.campaignType;

    const isSaveDisabled =
      isWorking || !hasPendingChanges || campaign.isStarted;
    const finalSaveLabel = isWorking ? "Working..." : saveLabel;

    return (
      <div>
        <CampaignFormSectionHeading
          title="Campaign type"
          subtitle="Choose whether this campaign will send SMS messages or make phone calls."
        />
        <FormControl component="fieldset" disabled={campaign.isStarted}>
          <FormLabel component="legend">Type</FormLabel>
          <RadioGroup
            name="campaignType"
            value={campaignType}
            onChange={this.handleChange}
            row
          >
            <FormControlLabel value="SMS" control={<Radio />} label="SMS" />
            <FormControlLabel value="CALL" control={<Radio />} label="Call" />
          </RadioGroup>
        </FormControl>
        {campaign.isStarted && (
          <p style={{ color: "gray", fontSize: 12 }}>
            Campaign type cannot be changed after the campaign has started.
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <Button
            variant="contained"
            disabled={isSaveDisabled}
            onClick={this.handleSubmit}
          >
            {finalSaveLabel}
          </Button>
        </div>
      </div>
    );
  }
}

const queries = {
  data: {
    query: gql`
      query getCampaignType($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          isStarted
          campaignType
        }
      }
    `,
    options: (ownProps: CampaignTypeInnerProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  }
};

const mutations = {
  editCampaign: (ownProps: CampaignTypeInnerProps) => (
    payload: CampaignTypeFormValues
  ) => ({
    mutation: gql`
      mutation editCampaignType(
        $campaignId: String!
        $payload: CampaignInput!
      ) {
        editCampaign(id: $campaignId, campaign: $payload) {
          id
          campaignType
        }
      }
    `,
    variables: {
      campaignId: ownProps.campaignId,
      payload
    }
  })
};

export default compose<CampaignTypeInnerProps, RequiredComponentProps>(
  asSection({
    title: "Campaign Type",
    readinessName: "campaignType",
    jobQueueNames: [],
    expandAfterCampaignStarts: true,
    expandableBySuperVolunteers: false
  }),
  loadData({
    queries,
    mutations
  })
)(CampaignTypeForm);
