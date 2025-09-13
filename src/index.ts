import Inquirer from "./core/inquirer.js";
import Terminal from "./core/terminal.js";
import logger from "./utils/logger.js";
import {
  AppError,
  NotionPageNotFoundError,
  NotionPermissionError,
  NotionTokenError,
  NotionSchemaError,
  ErrorCode
} from "./utils/errors.js";
import ConfigManager from "./config/index.js";

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

async function main() {
  try {
    console.clear();

    const config = ConfigManager.getConfig();
    logger.info('Application started', { version: '1.0.0' });

    const inquirer = new Inquirer();
    const terminal = new Terminal();

    while (true) {
      const { options: selectedOption } = await inquirer.start();

    if (selectedOption === 'exit') {
      logger.info('User chose to exit');
      process.exit(0);
    }

    if (selectedOption === 'cache-management') {
      await terminal.cacheManagement();
      continue; // Go back to main menu
    }

    const { questions, company } = await terminal.questionMenu(selectedOption);

    let success: boolean = false;

    if (selectedOption === "fetch-grind-question") {
      const result = await terminal.grindDatabase({
        questions,
        callback: (res: boolean) => res,
      });
      success = result === true;
    } else {
      const { database: selectedDatabase } = await inquirer.promptDatabaseSelection();

      if (selectedDatabase === 'exit') {
        logger.info('User chose to exit at database selection');
        process.exit(0);
      }

      const result = await terminal.databaseMenu(selectedDatabase, selectedOption, {
        questions,
        company,
        callback: (res: boolean) => res,
      });
      success = result === true;
    }

    if (success) {
      logger.success('Operation completed successfully');
    } else {
      logger.fail('Operation failed');
    }

    // Ask if user wants to continue
    console.log('\nPress Enter to return to main menu...');
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve(undefined));
    });
    console.clear();
    }
  } catch (error) {
    if (error instanceof NotionPageNotFoundError) {
      console.error('\n❌ Notion Page Not Found');
      console.error(`\n${error.message}`);
      logger.error('Notion page not found error', error.details);
    } else if (error instanceof NotionPermissionError) {
      console.error('\n❌ Notion Permission Error');
      console.error(`\n${error.message}`);
      logger.error('Notion permission error', error.details);
    } else if (error instanceof NotionTokenError) {
      console.error('\n❌ Notion Authentication Error');
      console.error(`\n${error.message}`);
      logger.error('Notion token error', error.details);
    } else if (error instanceof NotionSchemaError) {
      console.error('\n❌ Notion Database Schema Error');
      console.error(`\n${error.message}`);
      logger.error('Notion schema error', error.details);
    } else if (error instanceof AppError && error.code === ErrorCode.BROWSER_LAUNCH_ERROR) {
      console.error('\n❌ Browser Setup Required');
      console.error('\nThe Grind75 feature requires Chrome/Chromium to be installed.');
      console.error('Please see BROWSER_SETUP.md for installation instructions.');
      console.error('\nAlternatively, you can use:');
      console.error('  • Fetch All the LeetCode Questions\n');
      logger.error('Browser launch error', error.details);
    } else if (error instanceof AppError) {
      console.error(`\n❌ ${error.message}`);
      logger.error(`Application error: ${error.message}`, error.details);
    } else if (error instanceof Error) {
      console.error(`\n❌ Unexpected error: ${error.message}`);
      logger.error('Unexpected error', error);
    } else {
      console.error('\n❌ Unknown error occurred');
      logger.error('Unknown error occurred', error);
    }
    process.exit(1);
  }
}

main();
