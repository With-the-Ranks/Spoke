export const schema = `
  type TitleContentNotice {
    id: ID!
    title: String!
    avatarIcon: String!
    avatarColor: String!
    markdownContent: String!
  }

  union Notice = TitleContentNotice

  type NoticeEdge {
    cursor: Cursor!
    node: Notice!
  }

  type NoticePage {
    edges: [NoticeEdge!]!
    pageInfo: RelayPageInfo!
  }
`;

export default schema;
