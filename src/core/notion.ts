import axios, { AxiosRequestHeaders, AxiosResponse, AxiosError } from "axios";
import { Ora } from "ora";
import { QuestionModel } from "../types/database.js";
import { NotionType } from "../types/notion.js";
import chalk from "chalk";
import { INotionService } from "../interfaces/services.js";
import {
  NotionError,
  NotionPageNotFoundError,
  NotionPermissionError,
  NotionTokenError,
  NotionSchemaError
} from "../utils/errors.js";
import { withRetry } from "../utils/retry.js";
import logger from "../utils/logger.js";
import ConfigManager from "../config/index.js";
import { GrindQuestion } from "../types/grind.js";

import {
  addGrindQuestion,
  addLeetCodeQuestion,
} from "../query/notion.js";
import { Question } from "../types/leetcode.js";

class Notion implements INotionService {
  private _headers: AxiosRequestHeaders;

  constructor(notion: NotionType) {
    this._headers = {
      Accept: "application/json",
      "Notion-Version": notion.version,
      "Content-Type": "application/json",
    } as unknown as AxiosRequestHeaders;
  }

  setToken = (token: string): Promise<void> => {
    Object.assign(this._headers, {
      Authorization: `Bearer ${token}`,
    });
    ConfigManager.setNotionToken(token);
    logger.debug('Notion token set');
    return Promise.resolve();
  };

  validateIntegration = async (): Promise<void> => {
    try {
      logger.debug('Validating Notion integration');

      const response = await axios({
        method: "GET",
        url: "https://api.notion.com/v1/users/me",
        headers: this._headers,
      });

      logger.debug('Integration validation successful', {
        integrationName: response.data.name,
        type: response.data.type
      });

      if (response.data.type !== 'bot') {
        logger.warn('Integration is not a bot type, some features may not work correctly');
      }

      return Promise.resolve();
    } catch (error: any) {
      logger.error('Integration validation failed', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new NotionTokenError(
            'Invalid Notion integration token. Please check:\n' +
            '1. The token is correct and properly formatted\n' +
            '2. The integration has not been revoked\n' +
            '3. You\'re using an integration token (starts with "secret_")\n\n' +
            'Setup instructions:\n' +
            '1. Go to https://www.notion.so/my-integrations\n' +
            '2. Create a new integration or use an existing one\n' +
            '3. Copy the "Internal Integration Token"\n' +
            '4. Make sure the integration has access to the target page'
          );
        } else if (error.response?.status === 403) {
          throw new NotionPermissionError(
            'Integration lacks necessary permissions. Please check:\n' +
            '1. The integration is shared with the target page\n' +
            '2. The integration has "Read content", "Update content", and "Insert content" permissions\n' +
            '3. The workspace allows the integration'
          );
        }
        throw new NotionError(
          `Failed to validate integration: ${error.message}`,
          { status: error.response?.status }
        );
      }
      throw new NotionError(`Failed to validate integration: ${error.message}`);
    }
  };

  validatePage = async (pageId: string): Promise<void> => {
    try {
      const response = await axios({
        method: "GET",
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: this._headers,
      });

      logger.debug('Page validation successful', { pageId });
      return Promise.resolve();
    } catch (error: any) {
      logger.error('Page validation failed', { pageId, error: error.message });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new NotionPageNotFoundError(
            `Page not found or not accessible. Please check:\n` +
            `1. The page ID "${pageId}" is correct\n` +
            `2. The page is shared with your Notion integration\n` +
            `3. Your integration has the necessary permissions`,
            { pageId }
          );
        } else if (error.response?.status === 401) {
          throw new NotionTokenError(
            'Unauthorized access to Notion API. Please check your integration token.',
            { pageId }
          );
        } else if (error.response?.status === 403) {
          throw new NotionPermissionError(
            `Permission denied accessing page. The integration lacks permissions for page "${pageId}".`,
            { pageId }
          );
        }
        throw new NotionError(
          `Failed to validate page: ${error.message}`,
          { status: error.response?.status, pageId }
        );
      }
      throw new NotionError(`Failed to validate page: ${error.message}`, { pageId });
    }
  };

  getRecord = async (databaseId: string, filter: {} = {}) => {
    return await axios({
      method: "POST",
      url: `https://api.notion.com/v1/databases/${databaseId}/query`,
      headers: this._headers,
      data: JSON.stringify(filter),
    })
      .then(({ data }) => data)
      .catch((error: AxiosError | Error) => {
        logger.error('Failed to get Notion record', error);
        if (axios.isAxiosError(error)) {
          throw new NotionError(
            `Failed to get record: ${error.message}`,
            { status: error.response?.status, data: error.response?.data }
          );
        }
        throw new NotionError(`Failed to get record: ${error.message}`);
      });
  };

  createNotionDatabase = async (query: any) => {
    try {
      // Validate integration first
      await this.validateIntegration();

      // Extract page ID from query for validation
      const pageId = query.parent?.page_id;
      if (!pageId) {
        throw new NotionError('Invalid database query: missing page_id in parent');
      }

      // Validate page exists and is accessible
      await this.validatePage(pageId);

      logger.debug('Creating Notion database', { pageId });

      // Create the database
      const response = await withRetry(
        async () => {
          return await axios({
            method: "POST",
            url: "https://api.notion.com/v1/databases",
            headers: this._headers,
            data: query,
          });
        },
        {
          onRetry: (error, attempt) => {
            logger.warn('Retrying Notion database creation', { attempt, error: error.message });
          }
        }
      );

      logger.debug('Notion database created successfully', {
        databaseId: response.data.id,
        pageId
      });

      return response;
    } catch (error: any) {
      logger.error('Failed to create Notion database', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new NotionPageNotFoundError(
            'Failed to create database: Page not found or integration lacks permissions',
            { data: error.response?.data }
          );
        } else if (error.response?.status === 401) {
          throw new NotionTokenError(
            'Failed to create database: Invalid or expired Notion token'
          );
        } else if (error.response?.status === 403) {
          throw new NotionPermissionError(
            'Failed to create database: Integration lacks permissions for this operation'
          );
        } else if (error.response?.status === 400) {
          throw new NotionSchemaError(
            'Failed to create database: Invalid database schema or properties',
            { data: error.response?.data }
          );
        }
        throw new NotionError(
          `Failed to create database: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw error;
    }
  };

  notionLeetCodeQuestionHandler = async (
    databaseId: string,
    questions: Question[],
    spinner: Ora
  ) => {
    const taskList = [];
    let count = 0;
    spinner.text = "Adding questions to Notion";
    spinner.start();

    for (const question of questions) {
      let resp;
      spinner.text = `[${count + 1} of ${
        questions.length + 1
      }] Checking record ${chalk.green(question.title)} from Notion database`;
      const isExist = await this.getRecord(databaseId, {
        filter: {
          property: "No",
          number: {
            equals: parseInt(question.frontendQuestionId),
          },
        },
      });
      if (isExist.results.length > 0) {
        spinner.text = `[${count + 1} of ${
          questions.length + 1
        }] Updating ${chalk.green(question.title)} to Notion`;
        const splitUrl = isExist.results[0].url.split("/");
        const pageId = splitUrl.pop().split("-").pop();

        resp = await this.updateQuestion(
          pageId,
          question.freqBar,
          question.status,
          spinner
        );
      } else {
        spinner.text = `[${count + 1} of ${
          questions.length + 1
        }] Adding ${chalk.green(question.title)} to Notion`;
        resp = await this.addQuestion(
          spinner,
          addLeetCodeQuestion(databaseId, question)
        );
      }

      taskList.push(resp);
      count++;
    }
    await Promise.all(taskList);

    spinner.succeed("Operation executed successfully");

    return count;
  };

  addQuestion = async (spinner: Ora, query: {}) => {
    try {
      return await axios({
        method: "POST",
        url: "https://api.notion.com/v1/pages",
        headers: this._headers,
        data: query,
      });
    } catch (error: unknown) {
      spinner.fail("Failed to add questions to Notion");
      logger.error('Failed to add question to Notion', error);
      if (axios.isAxiosError(error)) {
        throw new NotionError(
          `Failed to add question: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw new NotionError(`Failed to add question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  updateQuestion = async (
    pageId: string,
    frequency: number,
    status: string,
    spinner: Ora
  ) => {
    try {
      return await axios({
        method: "PATCH",
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: this._headers,
        data: JSON.stringify({
          properties: {
            Frequency: {
              type: "number",
              number: parseFloat(frequency!.toFixed(2)),
            },
            Completed: {
              type: "checkbox",
              checkbox: status === "ac" ? true : false,
            },
          },
        }),
      });
    } catch (error: unknown) {
      spinner.fail("Failed to update questions to Notion");
      logger.error('Failed to update question in Notion', error);
      if (axios.isAxiosError(error)) {
        throw new NotionError(
          `Failed to update question: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw new NotionError(`Failed to update question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  createGrindDatabase = async (query: {}) =>
    await axios({
      method: "POST",
      url: "https://api.notion.com/v1/databases",
      headers: this._headers,
      data: query,
    });

  grindQuestionHandler = async (
    databaseId: string,
    questions: GrindQuestion[],
    spinner: Ora
  ): Promise<number> => {
    const taskList = [];
    let count = 0;
    spinner.text = "Adding questions to Notion";
    spinner.start();

    for (const question of questions) {
      let resp;
      spinner.text = `[${count + 1} of ${
        questions.length + 1
      }] Adding ${chalk.green(question.title)} to Notion`;
      resp = await this.addQuestion(
        spinner,
        addGrindQuestion(databaseId, question)
      );

      taskList.push(resp);
      count++;
    }
    await Promise.all(taskList);

    spinner.succeed("Operation executed successfully");

    return count;
  };
}

export default Notion;
