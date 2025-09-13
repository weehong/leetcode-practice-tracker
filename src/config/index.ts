import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

dotenv.config();

export interface Config {
  leetcode: {
    sessionId?: string;
  };
  notion: {
    token?: string;
    databaseId?: string;
    pageId?: string;
    version: string;
  };
  database: {
    connectionString?: string;
  };
  api: {
    retryAttempts: number;
    retryDelay: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    this.config = {
      leetcode: {
        sessionId: process.env.LEETCODE_SESSION_ID,
      },
      notion: {
        token: process.env.NOTION_TOKEN,
        databaseId: process.env.NOTION_DATABASE_ID,
        pageId: process.env.NOTION_PAGE_ID,
        version: '2022-06-28',
      },
      database: {
        connectionString: process.env.DATABASE_CONNECTION_STRING,
      },
      api: {
        retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000'),
      },
      logging: {
        level: (process.env.LOG_LEVEL as Config['logging']['level']) || 'info',
      },
    };

    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): Config {
    return this.config;
  }

  public updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
  }

  public setLeetCodeSession(sessionId: string): void {
    this.config.leetcode.sessionId = sessionId;
  }

  public setNotionToken(token: string): void {
    this.config.notion.token = token;
  }

  public setDatabaseConnectionString(connectionString: string): void {
    this.config.database.connectionString = connectionString;
  }

  private validateConfig(): void {
    const envPath = path.resolve(process.cwd(), '.env');
    const examplePath = path.resolve(process.cwd(), '.env.example');

    if (!existsSync(envPath) && existsSync(examplePath)) {
      console.warn('⚠️  No .env file found. Please copy .env.example to .env and configure your settings.');
    }
  }
}

export default ConfigManager.getInstance();