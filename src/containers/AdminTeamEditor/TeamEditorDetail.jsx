import React from "react";
import PropTypes from "prop-types";
import gql from "graphql-tag";

import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn
} from "material-ui/Table";
import AutoComplete from "material-ui/AutoComplete";
import Dialog from "material-ui/Dialog";
import RaisedButton from "material-ui/RaisedButton";
import PersonAddIcon from "material-ui/svg-icons/social/person-add";

import loadData from "../hoc/load-data";

const styles = {
  addMemberContainer: { display: "flex", alignItems: "baseline" },
  addMemberIcon: { marginRight: "10px" },
  spacer: { flex: 1 }
};

class TeamEditorDetail extends React.Component {
  state = {
    newTexterSearchText: "",
    selectedUserIds: [],
    isWorking: false,
    error: undefined
  };

  handleUpdateNewTexterInput = newTexterSearchText =>
    this.setState({ newTexterSearchText });

  handleNewTexterRequest = async ({ id: texterId }, index) => {
    // Force user to select from dropdown
    if (index === -1) return;
    this.setState({ isWorking: true });
    try {
      const response = await this.props.mutations.addTeamMebers([texterId]);
      if (response.errors) throw response.errors;
      this.setState({ newTexterSearchText: "" });
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ isWorking: false });
    }
  };

  handleCloseErrorDialog = () => this.setState({ error: undefined });

  isUserSelected = userId => this.state.selectedUserIds.indexOf(userId) !== -1;

  handleRowSelection = async selectedRowIndexes => {
    const { users } = this.props.team.team;
    const selectedUserIds = selectedRowIndexes.map(
      rowIndex => users[rowIndex].id
    );
    return this.setState({ selectedUserIds });
  };

  handleRemoveSelected = async () => {
    const { selectedUserIds } = this.state;
    this.setState({ isWorking: true });
    try {
      const response = await this.props.mutations.removeTeamMembers(
        selectedUserIds
      );
      if (response.errors) throw response.errors;
      this.setState({ selectedUserIds: [] });
    } catch (err) {
      this.setState({ error: err.message });
    } finally {
      this.setState({ isWorking: false });
    }
  };

  render() {
    const {
      newTexterSearchText,
      selectedUserIds,
      isWorking,
      error
    } = this.state;
    const { title, users } = this.props.team.team;
    const { people } = this.props.users.organization;

    const teamMemberIds = new Set(users.map(user => user.id));
    const nonMembers = people.filter(({ id }) => !teamMemberIds.has(id));

    const errorActions = [
      <RaisedButton label="OK" onClick={this.handleCloseErrorDialog} />
    ];

    return (
      <div>
        <h1>{title}</h1>
        <div style={styles.addMemberContainer}>
          <PersonAddIcon style={styles.addMemberIcon} />
          <AutoComplete
            hintText="Add Texter"
            searchText={newTexterSearchText}
            dataSource={nonMembers}
            dataSourceConfig={{ text: "displayName", value: "id" }}
            filter={AutoComplete.fuzzyFilter}
            openOnFocus={true}
            disabled={isWorking}
            onUpdateInput={this.handleUpdateNewTexterInput}
            onNewRequest={this.handleNewTexterRequest}
          />
          <div style={styles.spacer} />
          <RaisedButton
            label="Remove Selected"
            disabled={selectedUserIds.length === 0}
            onClick={this.handleRemoveSelected}
          />
        </div>
        <Table
          selectable={true}
          multiSelectable={true}
          onRowSelection={this.handleRowSelection}
        >
          <TableHeader
            displaySelectAll={false}
            enableSelectAll={false}
            adjustForCheckbox={true}
          >
            <TableRow>
              <TableHeaderColumn>Name</TableHeaderColumn>
              <TableHeaderColumn>Email</TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody showRowHover={true} deselectOnClickaway={false}>
            {users.map(user => (
              <TableRow key={user.id} selected={this.isUserSelected(user.id)}>
                <TableRowColumn>{user.displayName}</TableRowColumn>
                <TableRowColumn>{user.email}</TableRowColumn>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog
          title="Team Update Error"
          actions={errorActions}
          modal={false}
          open={error !== undefined}
          onRequestClose={this.handleCloseErrorDialog}
        >
          {error || ""}
        </Dialog>
      </div>
    );
  }
}

TeamEditorDetail.defaultProps = {};

TeamEditorDetail.propTypes = {
  params: PropTypes.shape({
    organizationId: PropTypes.string.isRequired,
    teamId: PropTypes.string.isRequired
  }).isRequired,
  team: PropTypes.shape({
    team: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      users: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          displayName: PropTypes.string.isRequired,
          email: PropTypes.string.isRequired
        })
      ).isRequired
    }).isRequired
  }).isRequired
};

const mapQueriesToProps = ({ ownProps }) => ({
  team: {
    query: gql`
      query getTeamWithMembers($teamId: String!) {
        team(id: $teamId) {
          id
          title
          users {
            id
            displayName
            email
          }
        }
      }
    `,
    variables: {
      teamId: ownProps.match.params.teamId
    }
  },
  users: {
    query: gql`
      query getOrganizationMembers($organizationId: String!) {
        organization(id: $organizationId) {
          id
          people {
            id
            displayName
            email
          }
        }
      }
    `,
    variables: {
      organizationId: ownProps.match.params.organizationId
    }
  }
});

const mapMutationsToProps = ({ ownProps }) => ({
  addTeamMebers: userIds => ({
    mutation: gql`
      mutation addTeamMebers($teamId: String!, $userIds: [String]!) {
        addUsersToTeam(teamId: $teamId, userIds: $userIds)
      }
    `,
    variables: {
      teamId: ownProps.match.params.teamId,
      userIds
    },
    refetchQueries: ["getTeamWithMembers"]
  }),
  removeTeamMembers: userIds => ({
    mutation: gql`
      mutation removeTeamMembers($teamId: String!, $userIds: [String]!) {
        removeUsersFromTeam(teamId: $teamId, userIds: $userIds)
      }
    `,
    variables: {
      teamId: ownProps.match.params.teamId,
      userIds
    },
    refetchQueries: ["getTeamWithMembers"]
  })
});

export default loadData(TeamEditorDetail, {
  mapQueriesToProps,
  mapMutationsToProps
});
