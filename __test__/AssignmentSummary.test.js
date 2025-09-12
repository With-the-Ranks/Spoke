/**
 * @jest-environment jsdom
 */
import { mount } from 'enzyme'
import { StyleSheetTestUtils } from 'aphrodite'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import { CardActions } from 'material-ui/Card'
import { AssignmentSummary } from '../src/components/AssignmentSummary'
import Badge from 'material-ui/Badge/Badge'
import RaisedButton from 'material-ui/RaisedButton/RaisedButton'

function getAssignment() {
  return {
    id: '1',
    campaign: {
      id: '1',
      title: 'New Campaign',
      description: 'asdf',
      hasUnassignedContacts: false,
      introHtml: 'yoyo',
      primaryColor: '#2052d8',
      logoImageUrl: ''
    }
  }
}

describe('AssignmentSummary text', function t() {
  beforeEach(() => {
    this.summary = mount(
      <MuiThemeProvider>
        <AssignmentSummary
          assignment={getAssignment()}
          unmessagedCount={1}
          unrepliedCount={0}
          badTimezoneCount={0}
          pastMessagesCount={0}
          skippedMessagesCount={0}
        />
      </MuiThemeProvider>
    )
  })

describe('AssignmentSummary actions inUSA and NOT AllowSendAll', () => {
  function create(unmessaged, unreplied, badTimezone, past, skipped) {
    return mount(
      <MuiThemeProvider>
        <AssignmentSummary
          assignment={getAssignment()}
          unmessagedCount={unmessaged}
          unrepliedCount={unreplied}
          badTimezoneCount={badTimezone}
          pastMessagesCount={past}
          skippedMessagesCount={skipped}
        />
      </MuiThemeProvider>
    ).find(CardActions)
  }

  it('renders "send first texts (1)" with unmessaged', () => {
    const actions = create(1, 0, 0, 0, 0, false)
    expect(actions.find(Badge).at(0).prop('badgeContent')).toBe(1)
    expect(actions.find(RaisedButton).at(0).prop('label')).toBe('Send first texts')
  })

  it('renders a "past messages" badge after messaged contacts', () => {
    const actions = create(0, 0, 0, 1, 0, false)
    expect(actions.find(RaisedButton).length).toBe(1)
  })

  it('renders two buttons with unmessaged and unreplied', () => {
    const actions = create(3, 9, 0, 0, 0, false)
    expect(actions.find(RaisedButton).length).toBe(2)
  })

  it('renders "past messages (n)" with messaged', () => {
    const actions = create(0, 0, 0, 9, 0, false)
    expect(actions.find(Badge).at(0).prop('badgeContent')).toBe(9)
    expect(actions.find(RaisedButton).at(0).prop('label')).toBe('Past Messages')
  })
})

it('renders "Send later" when there is a badTimezoneCount', () => {
  const actions = mount(
    <MuiThemeProvider>
      <AssignmentSummary
        assignment={getAssignment()}
        unmessagedCount={0}
        unrepliedCount={0}
        badTimezoneCount={4}
        skippedMessagesCount={0}
      />
    </MuiThemeProvider>
  ).find(CardActions)
  expect(actions.find(Badge).at(1).prop('badgeContent')).toBe(4)
  expect(actions.find(RaisedButton).at(0).prop('label')).toBe('Past Messages')
  expect(actions.find(RaisedButton).at(1).prop('label')).toBe('Send messages')
})

describe('contacts filters', () => {
  // These are an attempt to confirm that the buttons will work.
  // It would be better to simulate clicking them, but I can't
  // get it to work right now because of 'react-tap-event-plugin'
  // some hints are here https://github.com/mui-org/material-ui/issues/4200#issuecomment-217738345

  it('filters correctly in USA', () => {
    const mockRender = jest.fn()
    AssignmentSummary.prototype.renderBadgedButton = mockRender
    mount(
      <MuiThemeProvider>
        <AssignmentSummary
          assignment={getAssignment()}
          unmessagedCount={1}
          unrepliedCount={1}
          badTimezoneCount={4}
          skippedMessagesCount={0}
        />
      </MuiThemeProvider>
    )
    const sendFirstTexts = mockRender.mock.calls[0][0]
    expect(sendFirstTexts.title).toBe('Send first texts')
    expect(sendFirstTexts.contactsFilter).toBe('text')

    const sendReplies = mockRender.mock.calls[1][0]
    expect(sendReplies.title).toBe('Send replies')
    expect(sendReplies.contactsFilter).toBe('reply')

    const sendLater = mockRender.mock.calls[2][0]
    expect(sendLater.title).toBe('Past Messages')
    expect(sendLater.contactsFilter).toBe('stale')

    const skippedMessages = mockRender.mock.calls[3][0]
    expect(skippedMessages.title).toBe('Skipped Messages')
    expect(skippedMessages.contactsFilter).toBe('skipped')
  })
})

// https://github.com/Khan/aphrodite/issues/62#issuecomment-267026726
beforeEach(() => {
  StyleSheetTestUtils.suppressStyleInjection()
})
afterEach(() => {
  StyleSheetTestUtils.clearBufferAndResumeStyleInjection()
})
