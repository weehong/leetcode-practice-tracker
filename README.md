# LeetCode Practice Tracker

A TypeScript console application that collects LeetCode questions and stores them in PostgreSQL or Notion databases. Specializes in fetching LeetCode questions, Google-specific questions, and Grind75 questions.

## Features

- 🔍 Fetch questions from LeetCode's GraphQL API
- 🏢 Get company-specific questions (requires authentication)
- 📚 Scrape Grind75 questions from techinterviewhandbook.org
- 💾 Store data in PostgreSQL or Notion databases
- 📊 Structured logging with file rotation
- 🔧 Robust error handling and retry mechanisms
- ⚡ TypeScript with strict mode for type safety

## Prerequisites

- Node.js v18 or higher
- npm

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd leetcode-practice-tracker

# Install dependencies
npm install
```

## Usage

```bash
# Build and run the application
npm start

# Or manually build and run
npx tsc && node --es-module-specifier-resolution=node build/index.js
```

The application will present an interactive menu to:
- Choose question sources (LeetCode, Grind75, company-specific)
- Select storage destination (PostgreSQL, Notion)
- Configure fetching options

## Configuration

Create a `.env` file in the root directory:

```bash
# Optional: Set log level (default: info)
LOG_LEVEL=debug

# For LeetCode session (required for company-specific questions)
LEETCODE_SESSION=your_session_cookie

# For Notion integration
NOTION_TOKEN=your_notion_integration_token

# For PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
```

## Authentication

### LeetCode Session
For company-specific questions, you need your LeetCode session cookie:
1. Log into LeetCode in your browser
2. Open Developer Tools → Application → Cookies
3. Copy the `LEETCODE_SESSION` value
4. Add it to your `.env` file

### Notion Integration
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the integration token
3. Add it to your `.env` file

## Architecture

### Core Components

- **Entry Point** (`src/index.ts`): CLI interface and main application loop
- **User Interface** (`src/core/inquirer.ts`): Interactive prompts using inquirer.js
- **Terminal Controller** (`src/core/terminal.ts`): Main business logic orchestration

### Services

- **LeetCode** (`src/core/leetcode.ts`): GraphQL API integration
- **Grind** (`src/core/grind.ts`): Web scraping with Puppeteer
- **Database** (`src/core/database.ts`): PostgreSQL with Sequelize ORM
- **Notion** (`src/core/notion.ts`): Notion API integration

### Project Structure

```
src/
├── @types/         # Custom type definitions
├── core/           # Main business logic classes
├── query/          # GraphQL queries and database schemas
├── types/          # TypeScript type definitions
├── utils/          # Helper utilities and logging
└── index.ts        # Application entry point

build/              # Compiled JavaScript (gitignored)
logs/               # Application logs with rotation
```

## Logging

The application uses structured logging with daily rotation:
- Logs are written to the `logs/` directory
- Separate files by level: `info-YYYY-MM-DD.log`, `error-YYYY-MM-DD.log`
- Set `LOG_LEVEL=debug` in `.env` for verbose console output
- Automatic log rotation (10MB max, 5 files retained)
- Sensitive data is automatically sanitized from logs

## Error Handling

- Centralized error handling with custom error types
- Retry mechanisms with exponential backoff for API calls
- Graceful error recovery with user-friendly messages
- Robust web scraping with fallback selectors

## Browser Requirements
For Grind75 features, the application requires Chrome/Chromium to be installed. See `BROWSER_SETUP.md` for installation instructions if you encounter browser-related errors.

## FAQ
1. How to obtain the LeetCode Session ID?
Please visit this GitHub link to learn how to fetch the LeetCode Session ID from the browser. [Failed to log in with a leetcode.com account #478](https://github.com/LeetCode-OpenSource/vscode-leetcode/issues/478#issuecomment-559346357)

2. How to obtain the Notion Page ID or Database ID?
Please visit this Stack Overflow link to learn how to fetch the Notion Page or Database ID. https://stackoverflow.com/a/67652092
