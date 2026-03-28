# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building and Development

- `yarn dev` - Start development server with client and server hot-reloading
- `yarn build` - Build production bundle (client and server)
- `yarn start` - Start production server from built files
- `yarn codegen` - Generate GraphQL types and schema files

### Testing

- `yarn test` - Run all tests with Jest
- `yarn test:e2e` - Run end-to-end tests
- `yarn test:coverage` - Run tests with coverage report
- There are useful methods for test setup in `__test__/testbed-preparation/core.ts`

### Linting and Formatting

- `yarn lint` - Run ESLint on all TypeScript/JavaScript files
- `yarn lint:fix` - Fix auto-fixable linting issues
- `yarn format` - Check Prettier formatting
- `yarn format:fix` - Apply Prettier formatting

### Database Operations

- `yarn knex migrate:latest` - Run database migrations
- `yarn migrate:worker` - Run graphile-worker database setup (required once)
- `yarn knex migrate:make <name>` - Create new migration

## Architecture Overview

Spoke is a full-stack SMS texting platform for political campaigns and advocacy organizations, built with:

### Core Stack

- **Frontend**: React 17 with Material-UI v4, Apollo Client for GraphQL
- **Backend**: Node.js with Express, Apollo Server for GraphQL API
- **Database**: PostgreSQL with Knex.js ORM
- **Background Jobs**: Graphile Worker for async task processing
- **SMS Services**: Twilio, Nexmo, or Assemble Numbers integration

### Application Structure

#### Server Architecture (`src/server/`)

- **Entry Point**: `src/server/index.ts` - Main server with Lightship health checks
- **Server Modes**: Can run as Server, Worker, or Dual mode (both)
- **GraphQL API**: Apollo Server in `src/server/api/` with schema-first approach
- **Background Jobs**: Graphile Worker tasks in `src/server/tasks/`
- **Database Models**: Thinky ORM models in `src/server/models/`
- **Authentication**: Passport strategies (Auth0, Slack, Local) in `src/server/auth-passport/`

#### Client Architecture (`src/client/` and `src/containers/`)

- **Routing**: React Router with nested routes in `src/routes.jsx`
- **State Management**: Apollo Client cache + local component state
- **UI Components**: Reusable components in `src/components/`
- **Page Containers**: Feature containers in `src/containers/` organized by admin/texter roles
- **Internationalization**: i18next with locale files in `public/locales/`

#### Key Container Organization

- **Admin Containers**: Campaign management, user administration, messaging oversight
  - `AdminCampaignEdit/` - Campaign builder with multi-step form sections
  - `AdminIncomingMessageList/` - Message moderation and conversation management
  - `AdminPeople/` - User management and permissions
- **Texter Containers**: Front-line texting interface
  - `TexterTodo/` - Main texting interface with conversation threading
  - `AssignmentTexterContact/` - Individual contact interaction

### Database Schema

- Uses Knex migrations in `migrations/` directory
- Migrations should always include named functions - exports.up = function up(knex) and exports.down = function down(knex). Knex will leave them unnamed by default.
- Core entities: organizations, campaigns, users, messages, contacts
- Background job tables managed by Graphile Worker
- Supports read replicas via `DATABASE_READER_URL`

### Configuration System

- Environment-based configuration in `src/config.js` using envalid
- Extensive configuration options for SMS services, authentication, feature flags
- Client/server config separation with `isClient` flag

### Development Workflow

1. **Local Setup**: Docker Compose for PostgreSQL (`docker compose up postgres`)
2. **Database Setup**: Run worker migrations then Knex migrations
3. **Code Generation**: GraphQL schema and TypeScript types auto-generated
4. **Development Mode**: Webpack dev server + nodemon for hot reloading

### Code Conventions (from conventions.md)

- Component props interfaces: `[ComponentName]Props` pattern
- Use affirmative boolean variables (`showWarning` not `hideWarning`)
- Avoid unnecessary divs, return `null` instead of empty divs
- Use GraphQL codegen types from `@spoke/spoke-codegen`
- Error handling: Inline alerts for data errors, modals for action errors
- Styling: Single inline styles max, use `makeStyle` hooks for complex styling

### Key Features

- **Campaign Management**: Multi-step campaign creation with contact uploads
- **Message Threading**: Conversation-based texting with escalation support
- **Assignment System**: Dynamic contact assignment to texters
- **Integration Support**: VAN sync, external systems, webhook notifications
- **Multi-tenancy**: Organization-based access control and isolation

Always run `yarn knex migrate:latest` after pulling changes that include new migration files. The application supports both development with fake SMS service and production with real SMS providers.
