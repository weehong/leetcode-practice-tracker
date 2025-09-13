import chalk from "chalk";
import ora, { Ora } from "ora";
import { ValidationError, AppError, ErrorCode } from "../utils/errors.js";
import logger from "../utils/logger.js";
import CacheManager, { CacheStatusReport, NamespaceCacheStatus } from "../utils/cache.js";
import ConfigManager from "../config/index.js";

import {
  createGrindDatabase,
  createLeetCodeQuestionDatabase,
} from "../query/notion.js";
import { FavoriteList, Question } from "../types/leetcode.js";
import { questionLeetCodeQuery } from "../query/leetcode.js";
import { DatabaseArgumentsType } from "../types/terminal.js";
import { convertToString } from "../utils/leetcode.js";

import Database from "./database.js";
import Inquirer from "./inquirer.js";
import LeetCode from "./leetcode.js";
import Notion from "./notion.js";
import Grind from "./grind.js";

class Terminal {
  private _spinner: Ora;
  private _inquirier: Inquirer;
  private _leetcode: LeetCode;
  private _database: Database;
  private _notion: Notion;
  private _grind: Grind;

  constructor() {
    this._spinner = ora({
      color: "green",
    });
    this._leetcode = new LeetCode();
    this._database = new Database();
    this._notion = new Notion({
      version: "2022-06-28",
    });
    this._inquirier = new Inquirer();
  }

  questionMenu = async (answer: string) => {
    switch (answer) {
      case "fetch-leetcode-question":
        const sessionResp = await this.setupLeetCodeSession();

        const questions = await this._fetchLeetCodeQuestionHandler(
          sessionResp,
          questionLeetCodeQuery
        );

        this._spinner.succeed("Successfully fetched questions from LeetCode");

        return {
          questions,
        };
      case "fetch-favorite-question":
        const sessionResp2 = await this.setupLeetCodeSession();

        const favoriteQuestions = await this._fetchFavoriteQuestionHandler(sessionResp2.session);

        this._spinner.succeed("Successfully fetched favorite questions from LeetCode");

        return {
          questions: favoriteQuestions,
        };
      case "fetch-grind-question":
        try {
          const { weeks } = await this._inquirier.promptGrindWeeks();
          const { hours } = await this._inquirier.promptGrindHours();
          const { difficulty } = await this._inquirier.promptGrindDifficulty();

          this._grind = new Grind(weeks, hours, "weeks", difficulty);
          const grindQuestionWeek = await this._grind.getQuestions();

          this._grind = new Grind(weeks, hours, "topics", difficulty);
          const grindQuestionTopic = await this._grind.getQuestions();

          // Create a map for faster lookup of topic categories
          const topicCategoryMap = new Map();
          grindQuestionTopic.forEach((question) => {
            topicCategoryMap.set(question.title, question.category);
          });

          // Merge week and topic information properly
          grindQuestionWeek.forEach((question) => {
            const topicCategory = topicCategoryMap.get(question.title);

            // Store the week information (from the "weeks" grouping)
            const week = question.category;
            // Get the topic category (from the "topics" grouping)
            const category = topicCategory || question.category;

            Object.assign(question, {
              week: week,
              category: category
            });
          });

          return {
            questions: grindQuestionWeek,
            undefined,
          };
        } catch (error) {
          if (error instanceof AppError && error.code === ErrorCode.BROWSER_LAUNCH_ERROR) {
            console.error('\n❌ Browser Setup Required');
            console.error('\nThe Grind75 feature requires Chrome/Chromium to be installed.');
            console.error('Please see BROWSER_SETUP.md for installation instructions.');
            console.error('\nAlternatively, you can use:');
            console.error('  • Fetch All the LeetCode Questions');
            console.error('  • Fetch Question from Grind 75\n');
          }
          throw error;
        }
      case "cache-management":
        return {
          questions: [],
          company: undefined,
        };
      default:
        throw new ValidationError(`Invalid option selected: ${answer}`);
    }
  };

  databaseMenu = async (
    answer: string,
    questionType: string,
    args: DatabaseArgumentsType
  ) => {
    switch (answer) {
      case "postgresql":
        return await this._inquirier
          .promptDatabaseConnectionString()
          .then(async (res) => {
            const isActivate = await this._database.setConnectionString(
              res.connectionString
            );

            if (isActivate instanceof Error) {
              this._spinner.fail(
                chalk.red(
                  isActivate.message.charAt(0).toUpperCase() + isActivate.message.slice(1)
                )
              );
            }

            const count = await this._database.leetCodeQuestion(args.questions as any);

            return args.callback(count === args.questions.length);
          });
      case "notion":
        // Setup Notion token (from env or prompt)
        await this.setupNotionToken();

        // Setup Notion database (from env or prompt)
        const databaseId = await this.setupNotionDatabase(questionType, args);
        let count = 0;
        if (questionType === "fetch-leetcode-question" || questionType === "fetch-favorite-question") {
          count = await this._notion.notionLeetCodeQuestionHandler(
            databaseId,
            args.questions as any,
            this._spinner
          );
        } else {
          count = await this._notion.grindQuestionHandler(
            databaseId,
            args.questions as any,
            this._spinner
          );
        }

        return args.callback(count === args.questions.length);
      default:
        throw new ValidationError(`Invalid database selected: ${answer}`);
    }
  };

  grindDatabase = async (
    args: DatabaseArgumentsType
  ) => {
    // Setup Notion token (from env or prompt)
    await this.setupNotionToken();

    // Setup Grind Notion database (from env or prompt)
    const databaseId = await this.setupGrindNotionDatabase(args);

    const count = await this._notion.grindQuestionHandler(
      databaseId,
      args.questions as any,
      this._spinner
    );

    return args.callback(count === args.questions.length);
  };

  cacheManagement = async () => {
    while (true) {
      const { action } = await this._inquirier.promptCacheManagement();

      switch (action) {
        case "status":
          await this.showCacheStatus();
          break;
        case "clear-all":
          await this.clearAllCaches();
          break;
        case "clear-grind75":
          await this.clearCache('grind75');
          break;
        case "clear-leetcode":
          await this.clearCache('leetcode');
          break;
        case "cleanup":
          await this.cleanupCache();
          break;
        case "back":
          return;
        default:
          console.log(chalk.red('Invalid option selected'));
      }

      // Pause before showing menu again
      console.log('\nPress Enter to continue...');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve(undefined));
      });
    }
  };

  private async showCacheStatus(): Promise<void> {
    this._spinner.start('Analyzing cache...');
    const status: CacheStatusReport = CacheManager.getCacheStatus();
    this._spinner.stop();

    console.log(chalk.blue('\n📊 Cache Status Report\n'));

    // Memory Cache
    console.log(chalk.yellow('🧠 Memory Cache:'));
    console.log(`  Entries: ${status.memoryCache.entries}`);
    console.log(`  Size: ${this.formatBytes(status.memoryCache.size)} / ${this.formatBytes(status.memoryCache.maxSize)}`);
    console.log(`  Usage: ${Math.round((status.memoryCache.size / status.memoryCache.maxSize) * 100)}%\n`);

    // File Cache
    console.log(chalk.yellow('📁 File Cache:'));
    for (const [namespace, data] of Object.entries(status.fileCache)) {
      console.log(`  ${namespace.toUpperCase()}:`);
      console.log(`    Total Entries: ${data.totalEntries}`);
      console.log(`    Valid Entries: ${data.validEntries}`);
      console.log(`    Total Size: ${this.formatBytes(data.totalSize)}`);
      if (data.newestEntry) {
        const age = Date.now() - data.newestEntry;
        console.log(`    Newest: ${this.formatAge(age)} ago`);
      }
      console.log('');
    }
  }

  private async clearAllCaches(): Promise<void> {
    this._spinner.start('Clearing all caches...');
    await CacheManager.invalidate('grind75');
    await CacheManager.invalidate('leetcode');
    await CacheManager.invalidate('companies');
    this._spinner.succeed(chalk.green('✅ All caches cleared successfully'));
  }

  private async clearCache(namespace: string): Promise<void> {
    this._spinner.start(`Clearing ${namespace} cache...`);
    await CacheManager.invalidate(namespace);
    this._spinner.succeed(chalk.green(`✅ ${namespace} cache cleared successfully`));
  }

  private async cleanupCache(): Promise<void> {
    this._spinner.start('Cleaning up expired cache entries...');
    await CacheManager.cleanup();
    this._spinner.succeed(chalk.green('✅ Cache cleanup completed'));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private async setupNotionToken(): Promise<string> {
    const config = ConfigManager.getConfig();

    // Check if token is available in environment
    if (config.notion.token && config.notion.token.trim()) {
      logger.info('Using Notion token from environment configuration');
      await this._notion.setToken(config.notion.token);
      return config.notion.token;
    }

    // If no token in environment, prompt user
    logger.debug('No Notion token found in environment, prompting user');
    const { notionToken } = await this._inquirier.promptNotionToken();
    await this._notion.setToken(notionToken);
    return notionToken;
  }

  private async setupLeetCodeSession(): Promise<{ session: string }> {
    const config = ConfigManager.getConfig();

    // Check if session ID is available in environment
    if (config.leetcode.sessionId && config.leetcode.sessionId.trim()) {
      logger.info('Using LeetCode session ID from environment configuration');
      return { session: config.leetcode.sessionId };
    }

    // If no session ID in environment, prompt user
    logger.debug('No LeetCode session ID found in environment, prompting user');
    return await this._inquirier.promptSessionId();
  }

  private async setupNotionDatabase(questionType: string, args: DatabaseArgumentsType): Promise<string> {
    const config = ConfigManager.getConfig();

    // Check if both database ID and page ID are available in environment
    if (config.notion.databaseId && config.notion.databaseId.trim()) {
      logger.info('Using Notion database ID from environment configuration', {
        databaseId: config.notion.databaseId
      });
      return config.notion.databaseId;
    }

    // If database ID not in environment, check if page ID is available for database creation
    if (config.notion.pageId && config.notion.pageId.trim()) {
      logger.info('Using Notion page ID from environment configuration for database creation', {
        pageId: config.notion.pageId
      });

      // Create database using page ID from environment
      const res = await this._notion.createNotionDatabase(
        this.getNotionDatabaseSchema(questionType, config.notion.pageId, args)
      );

      if (res && res.data && res.data.id) {
        logger.info('Successfully created Notion database using environment page ID', {
          databaseId: res.data.id
        });
        return res.data.id;
      } else {
        throw new ValidationError('Failed to create database using environment page ID');
      }
    }

    // Fall back to prompting user for database selection
    logger.debug('No Notion database ID or page ID found in environment, prompting user');
    return await this.promptForNotionDatabase(questionType, args);
  }

  private getNotionDatabaseSchema(questionType: string, pageId: string, args: DatabaseArgumentsType) {
    if (questionType === "fetch-leetcode-question" || questionType === "fetch-favorite-question") {
      return createLeetCodeQuestionDatabase(pageId);
    } else {
      return createGrindDatabase(pageId);
    }
  }

  private async promptForNotionDatabase(questionType: string, args: DatabaseArgumentsType): Promise<string> {
    const { notionDbExists } = await this._inquirier.promptNotionDatabaseExists();

    if (notionDbExists) {
      const { notionDb } = await this._inquirier.promptNotionDatabase();
      return notionDb;
    } else {
      const { notionCreation } = await this._inquirier.promptNotionDatabaseCreation();
      if (notionCreation) {
        const { notionPg } = await this._inquirier.promptNotionPage();
        const res = await this._notion.createNotionDatabase(
          this.getNotionDatabaseSchema(questionType, notionPg, args)
        );

        if (res && res.data && res.data.id) {
          return res.data.id;
        } else {
          throw new ValidationError('Failed to create database');
        }
      } else {
        throw new ValidationError('User cancelled database creation');
      }
    }
  }

  private async setupGrindNotionDatabase(args: DatabaseArgumentsType): Promise<string> {
    const config = ConfigManager.getConfig();

    // Check if page ID is available for database creation
    if (config.notion.pageId && config.notion.pageId.trim()) {
      logger.info('Using Notion page ID from environment configuration for Grind database creation', {
        pageId: config.notion.pageId
      });

      // Create database using page ID from environment
      const res = await this._notion.createNotionDatabase(
        createGrindDatabase(config.notion.pageId)
      );

      if (res && res.data && res.data.id) {
        logger.info('Successfully created Grind Notion database using environment page ID', {
          databaseId: res.data.id
        });
        return res.data.id;
      } else {
        throw new ValidationError('Failed to create Grind database using environment page ID');
      }
    }

    // Fall back to prompting user
    logger.debug('No Notion page ID found in environment for Grind database, prompting user');
    const { notionCreation } = await this._inquirier.promptNotionDatabaseCreation();
    if (notionCreation) {
      const { notionPg } = await this._inquirier.promptNotionPage();
      const res = await this._notion.createNotionDatabase(createGrindDatabase(notionPg));

      if (res && res.data && res.data.id) {
        return res.data.id;
      } else {
        throw new ValidationError('Failed to create Grind database');
      }
    } else {
      throw new ValidationError('User cancelled database creation');
    }
  }

  private _leetCodeQuestionHandler = async (session: string, query: string): Promise<any> => {
    this._leetcode.setSessionId(session);
    this._spinner.start();
    return await this._leetcode
      .fetchQuestion(query, this._spinner)
      .then((data: any) => {
        return data;
      });
  };

  private _leetCodeFavoriteQuestionHandler = async (session: string): Promise<any> => {
    this._leetcode.setSessionId(session);
    this._spinner.start();

    // Try browser method first, fallback to direct API call
    try {
      logger.debug('Attempting to fetch favorites using browser automation');
      return await this._leetcode
        .fetchFavoriteQuestionsWithBrowser(this._spinner)
        .then((data: any) => {
          return data;
        });
    } catch (browserError: any) {
      logger.warn('Browser method failed, falling back to direct API call', {
        error: browserError.message
      });

      return await this._leetcode
        .fetchFavoriteQuestions(this._spinner)
        .then((data: any) => {
          return data;
        });
    }
  };

  private async _fetchLeetCodeQuestionHandler(
    sessionResp: { session: string } & { [x: string]: {} },
    query: string
  ): Promise<Question[]> {
    this._spinner.text = "Fetching questions from LeetCode";

    const questionResp: any[] = await Promise.all([
      await this._leetCodeQuestionHandler(
        sessionResp.session,
        JSON.stringify({
          query,
          variables: {
            categorySlug: "",
            skip: 0,
            limit: -1,
            filters: {},
          },
          operationName: "problemsetQuestionList",
        })
      ),
      await this._leetCodeQuestionHandler(
        sessionResp.session,
        JSON.stringify({
          query: query,
          variables: {
            categorySlug: "",
            skip: 0,
            limit: 1,
            filters: {
              orderBy: "FRONTEND_ID",
              sortOrder: "DESCENDING",
            },
          },
          operationName: "problemsetQuestionList",
        })
      ),
      await this._leetCodeFavoriteQuestionHandler(sessionResp.session).catch((error) => {
        logger.warn('Failed to fetch favorite questions, continuing without them', { error: error.message });
        return { data: [] }; // Return empty favorites data to maintain array structure
      }),
    ]);

    questionResp[0].data.data.problemsetQuestionList.questions.push(
      ...questionResp[1].data.data.problemsetQuestionList.questions
    );

    questionResp[0].data.data.problemsetQuestionList.questions.forEach(
      (question: Question) => {
        question.topicTagsString = convertToString(question.topicTags);
      }
    );

    this._mapfeaturedLists(
      questionResp[2].data || [],
      questionResp[0].data.data.problemsetQuestionList.questions
    );

    return questionResp[0].data.data.problemsetQuestionList.questions;
  }

  private async _fetchFavoriteQuestionHandler(session: string): Promise<Question[]> {
    this._spinner.text = "Fetching favorite questions from LeetCode";

    // First, get the favorite lists
    const favoriteLists = await this._leetCodeFavoriteQuestionHandler(session);

    if (!favoriteLists.data || !Array.isArray(favoriteLists.data)) {
      throw new ValidationError('No favorite lists found');
    }

    // Collect all question IDs from all favorite lists
    const allQuestionIds = new Set<number>();
    favoriteLists.data.forEach((list: any) => {
      if (list.questions && Array.isArray(list.questions)) {
        list.questions.forEach((questionId: number) => {
          allQuestionIds.add(questionId);
        });
      }
    });

    if (allQuestionIds.size === 0) {
      logger.info('No questions found in favorite lists');
      return [];
    }

    logger.debug(`Found ${allQuestionIds.size} unique questions across ${favoriteLists.data.length} favorite lists`);

    // Convert Set to Array for GraphQL query
    const questionIdsArray = Array.from(allQuestionIds);

    // Fetch detailed information for all questions and then filter
    // We'll fetch a larger set to ensure we get all the favorite questions
    const maxLimit = Math.max(5000, questionIdsArray.length * 2); // Ensure we get enough questions
    const questionResp = await this._leetCodeQuestionHandler(
      session,
      JSON.stringify({
        query: questionLeetCodeQuery,
        variables: {
          categorySlug: "",
          skip: 0,
          limit: maxLimit,
          filters: {}
        },
        operationName: "problemsetQuestionList",
      })
    );

    const allQuestions = questionResp.data.data.problemsetQuestionList.questions;

    // Filter to only include questions that are in our favorite lists
    const favoriteQuestions = allQuestions.filter((question: Question) => {
      const questionId = parseInt(question.frontendQuestionId);
      return allQuestionIds.has(questionId);
    });

    // Add topicTagsString to each question
    favoriteQuestions.forEach((question: Question) => {
      question.topicTagsString = convertToString(question.topicTags);
    });

    // Map favorite lists to questions
    this._mapfeaturedLists(favoriteLists.data, favoriteQuestions);

    logger.info(`Successfully processed ${favoriteQuestions.length} favorite questions`);

    return favoriteQuestions;
  }

  private _mapfeaturedLists = (
    favoritesList: FavoriteList[],
    questions: Question[]
  ) => {
    const questionsMap = new Map();

    favoritesList.forEach((list: FavoriteList) => {
      list.questions.map((question) => {
        const set = new Set(questionsMap.get(question));
        set.add(list.name);
        questionsMap.set(question, set);
      });
    });

    questions.forEach((question) => {
      const id = parseInt(question.frontendQuestionId);
      Object.assign(question, {
        featuredList: questionsMap.get(id)
          ? JSON.stringify(Array.from(questionsMap.get(id)))
          : undefined,
      });
    });
  };
}

export default Terminal;
