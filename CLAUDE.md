# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based console application that collects LeetCode questions and stores them in PostgreSQL or Notion databases. The app specializes in fetching LeetCode questions, Google-specific questions, and Grind75 questions.

## Essential Commands

### Build and Run
```bash
# Build TypeScript and run the application (requires Node v18)
npm start

# This compiles TypeScript to ./build/ and runs with ES module resolution
npx tsc && node --es-module-specifier-resolution=node build/index.js
```

### Development
```bash
# Install dependencies
npm install

# Compile TypeScript only
npx tsc
```

## Architecture Overview

### Core Application Flow
1. **Entry Point** (`src/index.ts`): Initializes the CLI interface and manages the main application loop
2. **User Interface** (`src/core/inquirer.ts`): Handles user prompts and menu selections using inquirer.js
3. **Terminal Controller** (`src/core/terminal.ts`): Orchestrates the main business logic and coordinates between different services

### Key Service Classes

- **LeetCode** (`src/core/leetcode.ts`): Handles authentication and fetching questions from LeetCode's GraphQL API
- **Grind** (`src/core/grind.ts`): Scrapes Grind75 questions using Puppeteer from techinterviewhandbook.org
- **Database** (`src/core/database.ts`): Manages PostgreSQL connections and data persistence using Sequelize
- **Notion** (`src/core/notion.ts`): Integrates with Notion API to create databases and store questions

### Data Flow Patterns

1. **Question Fetching**:
   - LeetCode questions use GraphQL queries defined in `src/query/leetcode.ts`
   - Grind75 questions are scraped using Puppeteer web automation
   - Company-specific questions require LeetCode session authentication

2. **Storage Options**:
   - PostgreSQL: Uses Sequelize ORM with model definitions in the Database class
   - Notion: Creates structured databases with properties matching question metadata

### Type System

The application uses TypeScript with strict mode enabled. Key type definitions are in:
- `src/types/leetcode.ts`: LeetCode question structures
- `src/types/database.ts`: Database model types
- `src/types/notion.ts`: Notion API types
- `src/types/terminal.ts`: Terminal/CLI argument types

### Authentication Requirements

- **LeetCode**: Requires LEETCODE_SESSION cookie for fetching questions
- **Notion**: Requires integration token with database creation permissions
- **PostgreSQL**: Requires connection string if using database storage

## Project Structure

```
src/
├── @types/         # Custom type definitions
├── core/           # Main business logic classes
├── query/          # GraphQL queries and Notion database schemas
├── types/          # TypeScript type definitions
├── utils/          # Helper utilities
└── index.ts        # Application entry point
```

Build output goes to `build/` directory and is gitignored.

## Recent Improvements (2024)

### Error Handling & Reliability
- Centralized error handling system with custom error types (`src/utils/errors.ts`)
- Replaced all `process.exit()` calls with proper error throwing
- Retry mechanism for API calls with exponential backoff (`src/utils/retry.ts`)
- Graceful error recovery and user-friendly error messages
- Browser dependency error handling with helpful setup instructions
- Robust web scraping with fallback selectors and error recovery

### Configuration Management
- Environment variable support with `.env` file
- Centralized configuration management (`src/config/index.ts`)
- Secure handling of sensitive data (session IDs, tokens)
- Configuration validation with schemas

### Logging & Monitoring
- File-based logging system with daily rotation (`logs/` directory)
- Structured logging with configurable levels (`src/utils/logger.ts`)
- Automatic data sanitization to prevent logging of sensitive information
- Clean console interface - logs written to files by default
- **Debug Mode**: Set `LOG_LEVEL=debug` in `.env` to show all logs in console for development
- Log rotation with size limits (10MB) and retention (5 files)
- Separate log files by level and date (e.g., `info-2025-01-01.log`, `error-2025-01-01.log`)

### Type Safety
- Complete TypeScript interfaces for all services (`src/interfaces/services.ts`)
- Proper type definitions for Grind75 questions (`src/types/grind.ts`)
- Input validation schemas using Zod (`src/utils/validation.ts`)
- Removed all `any` types and added proper type annotations

### Code Architecture
- Service layer interfaces for better maintainability
- Dependency injection patterns
- Clear separation of concerns between UI, business logic, and data layers