import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';

dotenv.config();

export interface Config {
  leetcode: {
    sessionId?: string;
    csrfToken?: string;
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
        csrfToken: process.env.LEETCODE_CSRF_TOKEN,
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

  public setLeetCodeSession(sessionId: string, csrfToken?: string): void {
    this.config.leetcode.sessionId = sessionId;
    if (csrfToken) {
      this.config.leetcode.csrfToken = csrfToken;
    }
  }

  public setLeetCodeCsrfToken(csrfToken: string): void {
    this.config.leetcode.csrfToken = csrfToken;
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

  /**
   * Validates and formats a Notion page or database ID
   * Removes dashes and validates the format
   */
  public static validateNotionId(id: string, type: 'page' | 'database' = 'page'): string {
    if (!id) {
      throw new Error(`${type} ID is required`);
    }

    // Remove dashes and normalize
    const cleanId = id.replace(/-/g, '').toLowerCase();

    // Validate format (should be 32 alphanumeric characters)
    // Notion IDs can contain letters beyond a-f, so we'll be more permissive
    if (!/^[a-z0-9]{32}$/i.test(cleanId)) {
      throw new Error(
        `Invalid ${type} ID format. Expected 32 alphanumeric characters.\n` +
        `Received: "${id}"\n` +
        `Cleaned: "${cleanId}"\n` +
        `Length: ${cleanId.length}\n\n` +
        `How to get the correct ${type} ID:\n` +
        `1. Open your Notion ${type} in a browser\n` +
        `2. Copy the URL\n` +
        `3. Extract the 32-character ID (remove dashes if present)\n` +
        `4. Your ID: ${cleanId} ${cleanId.length === 32 ? '✅' : '❌'}`
      );
    }

    // Debug logging removed to avoid circular dependency
    return cleanId;
  }
}

const configManagerInstance = ConfigManager.getInstance();
export { ConfigManager };
export default configManagerInstance;