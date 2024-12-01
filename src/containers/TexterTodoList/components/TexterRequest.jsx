import { gql } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import MenuItem from "material-ui/MenuItem";
import SelectField from "material-ui/SelectField";
import TextField from "material-ui/TextField";
import React from "react";
import { withTranslation } from "react-i18next";
import * as yup from "yup";

import { RequestAutoApproveType } from "../../../api/organization-membership";
import GSForm from "../../../components/forms/GSForm";
import LoadingIndicator from "../../../components/LoadingIndicator";
import { titleCase } from "../../../lib/scripts";
import { loadData } from "../../hoc/with-operations";

class TexterRequest extends React.Component {
  constructor(props) {
    super(props);

    const myCurrentAssignmentTargets = this.props.data.organization
      ? this.props.data.organization.myCurrentAssignmentTargets
      : [];

    const firstAssignmentTarget = myCurrentAssignmentTargets[0];

    const [firstTeamId, maxRequestCount] = firstAssignmentTarget
      ? [firstAssignmentTarget.teamId, firstAssignmentTarget.maxRequestCount]
      : [undefined, undefined];

    this.state = {
      selectedAssignment: firstTeamId,
      count: maxRequestCount,
      maxRequestCount,
      email: undefined,
      submitting: false,
      error: undefined,
      finished: false
    };
  }

  UNSAFE_componentWillMount() {
    // eslint-disable-next-line react/no-direct-mutation-state
    this.state.email = this.props.user.email;
  }

  componentDidMount() {
    this.props.data.refetch();
  }

  submit = async () => {
    const { count, email, selectedAssignment, submitting } = this.state;
    const { mutations, t } = this.props;
    if (submitting) return;

    this.setState({ submitting: true, error: undefined });
    try {
      const payload = { count, email, preferredTeamId: selectedAssignment };
      const response = await mutations.requestTexts(payload);
      if (response.errors) throw response.errors;

      const message = response.data.requestTexts;

      if (message.includes("Created")) {
        this.setState({ finished: true });
      } else if (message === "Unrecognized email") {
        this.setState({
          error: t("unrecognized email error")
        });
      } else if (
        message === "Not created; a shift already requested < 10 mins ago."
      ) {
        this.setState({
          error: t("recent request error")
        });
      } else if (message === "No texts available at the moment") {
        this.setState({ error: t("no texts message") });
      } else {
        this.setState({ finished: true });
      }
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ submitting: false });
    }
  };

  setSelectedAssignment = (_1, _2, teamId) => {
    const myCurrentAssignmentTargets = this.props.data.organization
      ? this.props.data.organization.myCurrentAssignmentTargets
      : [];

    const selection = myCurrentAssignmentTargets.find(
      (at) => at.teamId === teamId
    );

    this.setState({
      selectedAssignment: teamId,
      count: Math.min(this.state.count, selection.maxRequestCount),
      maxRequestCount: selection.maxRequestCount
    });
  };

  userCanRequest = (memberships) => {
    const { organizationId } = this.props;
    const membership = memberships.edges
      .map(({ node }) => node)
      .find(({ organization }) => organization.id === organizationId);
    return (
      membership.requestAutoApprove !== RequestAutoApproveType.DO_NOT_APPROVE
    );
  };

  render() {
    const { data, t } = this.props;

    if (data.loading) {
      return <LoadingIndicator />;
    }

    const { myCurrentAssignmentTargets, settings } = data.organization;

    const textsAvailable = myCurrentAssignmentTargets.length > 0;

    if (data.currentUser.currentRequest) {
      const { amount } = data.currentUser.currentRequest;

      return (
        <Paper>
          <div style={{ padding: "20px" }}>
            <h3>{t("request pending message")}</h3>
            <p>{t("approval pending message", { amount })}</p>
          </div>
        </Paper>
      );
    }

    if (
      !this.userCanRequest(data.currentUser.memberships) &&
      settings.showDoNotAssignMessage
    ) {
      return (
        <Paper>
          <div style={{ padding: "20px" }}>
            <h3>{t("assignment request disabled")}</h3>
            <p>{settings.doNotAssignMessage}</p>
          </div>
        </Paper>
      );
    }

    if (!textsAvailable) {
      return (
        <Paper>
          <div style={{ padding: "20px" }}>
            <h3>{t("no texts message")}</h3>
            <p>{t("watch for announcement")}</p>
          </div>
        </Paper>
      );
    }

    const {
      email,
      count,
      error,
      submitting,
      finished,
      selectedAssignment,
      maxRequestCount
    } = this.state;
    const inputSchema = yup.object({
      count: yup.number().required(),
      email: yup.string().required()
    });

    if (finished) {
      return (
        <div>
          <h3>{t("request success")}</h3>
          <p>{t("expect texts")}</p>
        </div>
      );
    }

    const makeOptionText = (at) =>
      `${at.teamTitle}: ${at.maxRequestCount ?? ""} ${
        at.type === "UNSENT" ? t("initials") : t("replies")
      }`;

    return (
      <div>
        <div style={{ textAlign: "center" }}>
          <h1>{t("ready to text q")}</h1>
          <p style={{ marginTop: 5, marginBottom: 5 }}>Pick an assignment: </p>
          {data ? (
            <SelectField
              value={selectedAssignment}
              onChange={this.setSelectedAssignment}
              fullWidth
            >
              {data.organization.myCurrentAssignmentTargets.map((at) => (
                <MenuItem
                  key={at.teamId}
                  value={at.teamId}
                  primaryText={makeOptionText(at)}
                />
              ))}
            </SelectField>
          ) : (
            <LoadingIndicator />
          )}
        </div>
        <GSForm
          ref="requestForm"
          schema={inputSchema}
          value={{ email, count }}
          onSubmit={this.submit}
        >
          <label htmlFor="count">
            {titleCase(t("count"))}:
            <TextField
              name="count"
              label="Count"
              type="number"
              value={count}
              onChange={(e) => {
                const formVal = parseInt(e.target.value, 10) || 0;
                let newCount =
                  maxRequestCount > 0
                    ? Math.min(maxRequestCount, formVal)
                    : formVal;
                newCount = Math.max(newCount, 0);
                this.setState({ count: newCount });
              }}
            />
          </label>
          <br />
          <Button
            variant="contained"
            color="primary"
            disabled={submitting}
            fullWidth
            onClick={this.submit}
          >
            {t("request more texts")}
          </Button>
        </GSForm>
        {error && (
          <div style={{ color: "red" }}>
            <p> {error} </p>
          </div>
        )}
      </div>
    );
  }
}

const queries = {
  data: {
    query: gql`
      query currentUserFormInfo($organizationId: String!) {
        currentUser {
          id
          currentRequest(organizationId: $organizationId) {
            id
            status
            amount
          }
          memberships {
            edges {
              node {
                id
                requestAutoApprove
                organization {
                  id
                }
              }
            }
          }
        }
        organization(id: $organizationId) {
          id
          myCurrentAssignmentTargets {
            type
            maxRequestCount
            teamTitle
            teamId
          }
          settings {
            showDoNotAssignMessage
            doNotAssignMessage
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        organizationId: ownProps.organizationId
      },
      fetchPolicy: "network-only",
      pollInterval: 5000
    })
  }
};

const mutations = {
  requestTexts: (ownProps) => ({ count, email, preferredTeamId }) => ({
    mutation: gql`
      mutation requestTexts(
        $count: Int!
        $email: String!
        $organizationId: String!
        $preferredTeamId: String!
      ) {
        requestTexts(
          count: $count
          email: $email
          organizationId: $organizationId
          preferredTeamId: $preferredTeamId
        )
      }
    `,
    variables: {
      count,
      email,
      preferredTeamId,
      organizationId: ownProps.organizationId
    }
  })
};

export default withTranslation("TexterRequest")(
  loadData({
    queries,
    mutations
  })(TexterRequest)
);
