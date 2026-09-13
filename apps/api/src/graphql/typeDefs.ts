import gql from 'graphql-tag';

export const typeDefs = gql`
  enum Role {
    OWNER
    ADMIN
    DEVELOPER
    PRODUCT_MANAGER
    SRE
    VIEWER
  }

  enum FlagType {
    BOOLEAN
    MULTIVARIATE
    JSON
  }

  type User {
    id: ID!
    email: String!
    name: String!
    avatarUrl: String
    isVerified: Boolean!
    createdAt: String!
  }

  type Member {
    id: ID!
    userId: ID!
    organizationId: ID!
    role: Role!
    user: User!
    createdAt: String!
  }

  type Environment {
    id: ID!
    name: String!
    key: String!
    clientApiKey: String!
    serverApiKey: String!
    version: Int!
  }

  type Project {
    id: ID!
    name: String!
    key: String!
    description: String
    environments: [Environment!]!
  }

  type Organization {
    id: ID!
    name: String!
    slug: String!
    createdAt: String!
    projects: [Project!]!
    members: [Member!]!
  }

  type FeatureFlag {
    id: ID!
    key: String!
    name: String!
    description: String
    type: FlagType!
    isArchived: Boolean!
  }

  type Query {
    systemHealth: String!
    me: User
    organizations: [Organization!]!
    organization(id: ID!): Organization
    projects(organizationId: ID!): [Project!]!
    members(organizationId: ID!): [Member!]!
    flags(projectId: ID!): [FeatureFlag!]!
  }

  type Mutation {
    inviteMember(organizationId: ID!, email: String!, role: Role!): Member!
    updateMemberRole(organizationId: ID!, memberId: ID!, role: Role!): Member!
    removeMember(organizationId: ID!, memberId: ID!): Boolean!
  }
`;
