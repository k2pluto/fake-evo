# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build Commands
```bash
# Full build (TypeScript + Webpack)
npm run build

# Build specific services
npm run build:api1        # ESBuild for API
npm run build:api2        # Webpack for API
npm run build:resolver    # Build resolver service
npm run build:history     # Build history service
```

### Start Commands
```bash
# Development (different environments)
npm run start-api1        # Remote prod environment
npm run start-api2        # Korea environment with ts-node
npm run start-api:prod    # Production with fchev vendor
npm run start-api:tomato  # Tomato environment with fcevo vendor
npm run start-api:prod-local  # Local production

# WebSocket testing
npm run start-ws:prod     # Start WebSocket test server
```

### Testing
```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:debug        # Debug mode with inspector
npm run test:e2e          # End-to-end tests
```

### Code Quality
```bash
npm run lint              # Run TSLint
npm run format            # Format with Prettier
```

## Architecture Overview

This is a multi-service Node.js/TypeScript application with the following key modules:

### Core Services
- **fake-api** (`src/fake-api/`): Main API service built with Fastify
  - Entry point: `src/fake-api/main.ts`
  - Supports both Lambda and standalone deployment
  - WebSocket support included

- **fake-history** (`src/fake-history/`): History tracking and data management
- **fake-resolver** (`src/fake-resolver/`): Resolution and processing service
- **seamless** (`src/seamless/`): Seamless integration module
- **token-generator** (`src/token-generator/`): JWT and token generation service

### Supporting Modules
- **web-server** (`src/web-server/`): Additional web server functionality
- **tools** (`src/tools/`): Utilities and helper functions
- **common** (`src/common/`): Shared utilities and types

### Configuration Structure
Each service has its own config directory with environment-specific settings:
- `config/index.js` - Main configuration
- `config/prod.js` - Production settings
- `config/test.js` - Test environment settings

## Environment Management

### Stage Environments
- `remote-prod`: Remote production
- `korea`: Korea-specific environment
- `tomato`: Tomato environment with fcevo vendor
- `lemon`: Lemon environment (default for builds)
- `prod-local`: Local production testing

### Vendor Settings
- `fchev`: Production vendor setting
- `fcevo`: Alternative vendor for tomato environment

## Deployment

### Serverless Configurations
- `serverless.fake-api.yml` - Main API Lambda deployment
- `serverless.seamless.fake.yml` - Seamless service deployment
- `serverless.token-generator.yml` - Token generator service
- `serverless.token-generator.pluto.yml` - Pluto-specific token generator

### Webpack Bundling
- Multiple webpack configs for different deployment targets
- `webpack.config.api.js` - Main API bundling with extensive externals
- Environment-specific optimization (development vs production)

## Database Integration

The application integrates with:
- **MongoDB**: Primary database with TypeORM
- **MySQL**: Secondary database support
- Connection configurations are environment-specific

## Development Notes

### TypeScript Configuration
- Target: ESNext with CommonJS modules
- Decorators enabled for TypeORM/NestJS compatibility
- Path mapping: `@service/*` points to `./service/*`

### Code Style
- ESLint configuration in `.eslintrc.cjs`
- Prettier formatting enabled
- Semi-colons disabled (per TypeScript ESLint config)
- Console statements allowed for debugging

### Testing Setup
- Jest with TypeScript preset
- Tests located in `__tests__/` directories
- 5-minute timeout for longer integration tests
- Module name mapping for `@service/*` imports

### Memory Monitoring
The main application includes built-in memory usage monitoring that logs RSS memory consumption every 30 seconds.