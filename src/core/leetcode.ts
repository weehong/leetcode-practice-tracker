import axios, { AxiosRequestHeaders, AxiosError } from "axios";
import { Ora } from "ora";
import puppeteer from "puppeteer";
import { ILeetCodeService } from "../interfaces/services.js";
import { LeetCodeError, AuthError } from "../utils/errors.js";
import { withRetry } from "../utils/retry.js";
import logger from "../utils/logger.js";
import ConfigManager from "../config/index.js";
import CacheManager from "../utils/cache.js";
import crypto from "crypto";
import { questionDetailQuery } from "../query/leetcode.js";
import { QuestionDetail } from "../types/leetcode.js";

class LeetCode implements ILeetCodeService {
  private _headers: AxiosRequestHeaders;
  private _sessionHash: string = '';

  constructor() {
    this._headers = {
      "Content-Type": "application/json",
    } as unknown as AxiosRequestHeaders;
  }

  setSessionId = (sessionId: string, csrfToken?: string): void => {
    const config = ConfigManager.getConfig();
    const token = csrfToken || config.leetcode.csrfToken;

    // Build cookie string with both session and CSRF token
    const cookieValue = token
      ? `LEETCODE_SESSION=${sessionId}; csrftoken=${token}`
      : `LEETCODE_SESSION=${sessionId}`;

    Object.assign(this._headers, {
      cookie: cookieValue,
      referer: 'https://leetcode.com/',
    });

    // Add x-csrftoken header if CSRF token is available
    if (token) {
      Object.assign(this._headers, {
        'x-csrftoken': token,
      });
    }

    ConfigManager.setLeetCodeSession(sessionId, token);
    // Generate session hash for cache keys
    this._sessionHash = crypto.createHash('md5').update(sessionId).digest('hex').substring(0, 8);
    logger.debug('LeetCode session ID set', { hasCsrfToken: !!token });
  };

  fetchQuestion = async (requestBody: string, spinner: Ora) => {
    const parsedBody = JSON.parse(requestBody);
    const cacheKey = `${this._sessionHash}_${crypto.createHash('md5').update(requestBody).digest('hex')}`;

    // Check cache first
    const cachedData = await CacheManager.get('leetcode', cacheKey);
    if (cachedData) {
      logger.info('Using cached LeetCode questions', { cacheKey });
      spinner.succeed('Loaded questions from cache');
      // Return in the same format as an Axios response
      return { data: cachedData };
    }

    spinner.start();
    logger.debug('Fetching LeetCode questions from API', { requestBody: parsedBody });

    const response = await withRetry(
      async () => {
        const response = await axios({
          method: "POST",
          url: "https://leetcode.com/graphql",
          data: requestBody,
          headers: this._headers,
          validateStatus: (status: number) => status >= 200 && status < 300,
        });

        return response;
      },
      {
        onRetry: (error, attempt) => {
          spinner.text = `Retrying LeetCode API call (attempt ${attempt})...`;
          logger.warn('Retrying LeetCode question fetch', { attempt, error: error.message });
        }
      }
    ).catch((error: AxiosError | Error) => {
      spinner.fail('Failed to fetch questions from LeetCode');
      logger.error('Failed to fetch LeetCode questions', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AuthError('Invalid or expired LeetCode session. Please login again.');
        }
        throw new LeetCodeError(
          `Failed to fetch questions: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw new LeetCodeError(`Failed to fetch questions: ${error.message}`);
    });

    // Cache only the response data for 6 hours
    await CacheManager.set('leetcode', cacheKey, response.data, {
      ttl: 6 * 60 * 60 * 1000, // 6 hours
    });
    logger.debug('LeetCode response cached', { cacheKey });

    return response;
  };

  fetchFavoriteQuestions = async (spinner: Ora) => {
    const cacheKey = `${this._sessionHash}_favorites`;

    // Check cache first
    const cachedData = await CacheManager.get('leetcode', cacheKey);
    if (cachedData) {
      logger.info('Using cached favorite questions', { cacheKey });
      spinner.succeed('Loaded favorites from cache');
      // Return in the same format as an Axios response
      return { data: cachedData };
    }

    spinner.start();
    logger.debug('Fetching favorite questions from LeetCode API');

    const response = await withRetry(
      async () => {
        const response = await axios({
          method: "GET",
          url: "https://leetcode.com/problems/api/favorites/",
          headers: this._headers,
          validateStatus: (status: number) => status >= 200 && status < 300,
        });
        // Cache only the response data for 6 hours
        await CacheManager.set('leetcode', cacheKey, response.data, {
          ttl: 6 * 60 * 60 * 1000, // 6 hours
        });
        logger.debug('Favorite questions cached', { cacheKey });
        return response;
      },
      {
        onRetry: (error, attempt) => {
          spinner.text = `Retrying favorite questions fetch (attempt ${attempt})...`;
          logger.warn('Retrying favorite questions fetch', { attempt, error: error.message });
        }
      }
    ).catch((error: AxiosError | Error) => {
      spinner.fail('Failed to fetch favorite questions from LeetCode');
      logger.error('Failed to fetch favorite questions', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AuthError('Invalid or expired LeetCode session. Please login again.');
        }
        throw new LeetCodeError(
          `Failed to fetch favorite questions: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw new LeetCodeError(`Failed to fetch favorite questions: ${error.message}`);
    });
  };

  fetchFavoriteQuestionsWithBrowser = async (spinner: Ora) => {
    const cacheKey = `${this._sessionHash}_favorites_browser`;

    // Check cache first
    const cachedData = await CacheManager.get('leetcode', cacheKey);
    if (cachedData) {
      logger.info('Using cached favorite questions (browser method)', { cacheKey });
      spinner.succeed('Loaded favorites from cache');
      // Return in the same format as an Axios response
      return { data: cachedData };
    }

    spinner.start();
    logger.debug('Fetching favorite questions using browser automation');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled",
        ],
      });

      const page = await browser.newPage();

      // Set user agent to look like a real browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set viewport
      await page.setViewport({ width: 1366, height: 768 });

      // Set session cookie if available
      const config = ConfigManager.getConfig();
      if (config.leetcode.sessionId) {
        await page.setCookie({
          name: 'LEETCODE_SESSION',
          value: config.leetcode.sessionId,
          domain: '.leetcode.com',
          path: '/',
        });
      }

      // Navigate to the favorites API endpoint
      logger.debug('Navigating to favorites API endpoint');
      const response = await page.goto('https://leetcode.com/problems/api/favorites/', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      if (!response) {
        throw new Error('No response received from page navigation');
      }

      // Wait for any Cloudflare challenge to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get the page content
      const content = await page.content();

      // Check if we got JSON data or HTML challenge page
      if (content.includes('<!DOCTYPE html>') && content.includes('Just a moment')) {
        logger.debug('Cloudflare challenge detected, waiting for completion...');

        // Wait for challenge to complete and page to load JSON
        await page.waitForFunction(
          () => {
            const body = document.body.textContent || document.body.innerText || '';
            try {
              JSON.parse(body);
              return true;
            } catch {
              return false;
            }
          },
          { timeout: 30000 }
        );

        await new Promise(resolve => setTimeout(resolve, 2000)); // Additional wait for stability
      }

      // Extract the JSON data
      const jsonData = await page.evaluate(() => {
        const bodyText = document.body.textContent || document.body.innerText || '';
        try {
          return JSON.parse(bodyText);
        } catch (error: any) {
          throw new Error(`Failed to parse JSON: ${error.message}`);
        }
      });

      logger.info(`Successfully fetched ${jsonData.length || 0} favorite lists using browser automation`);
      spinner.succeed(`Fetched ${jsonData.length || 0} favorite lists`);

      // Cache the data for 6 hours
      await CacheManager.set('leetcode', cacheKey, jsonData, {
        ttl: 6 * 60 * 60 * 1000, // 6 hours
      });
      logger.debug('Favorite questions cached (browser method)', { cacheKey });

      return { data: jsonData };

    } catch (error: any) {
      spinner.fail('Failed to fetch favorite questions using browser');
      logger.error('Failed to fetch favorite questions using browser automation', error);

      if (error.message?.includes('Navigation timeout')) {
        throw new LeetCodeError('Timeout while loading favorites page. The service may be slow or unavailable.');
      } else if (error.message?.includes('Failed to parse JSON')) {
        throw new LeetCodeError('Received invalid response from favorites API. The page may still be loading.');
      } else {
        throw new LeetCodeError(`Browser automation failed: ${error.message}`);
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  };

  fetchQuestionDetail = async (titleSlug: string, spinner?: Ora): Promise<{ data: { data: { question: QuestionDetail } } }> => {
    const cacheKey = `${this._sessionHash}_detail_${titleSlug}`;

    // Check cache first
    const cachedData = await CacheManager.get('leetcode', cacheKey);
    if (cachedData) {
      logger.info('Using cached question detail', { titleSlug, cacheKey });
      if (spinner) {
        spinner.succeed(`Loaded question detail for ${titleSlug} from cache`);
      }
      // Return in the same format as an Axios response
      return { data: cachedData as { data: { question: QuestionDetail } } };
    }

    if (spinner) {
      spinner.start();
      spinner.text = `Fetching question detail for ${titleSlug}...`;
    }
    logger.debug('Fetching question detail from LeetCode API', { titleSlug });

    const requestBody = JSON.stringify({
      query: questionDetailQuery,
      variables: { titleSlug },
      operationName: "getQuestionDetail",
    });

    const response = await withRetry(
      async () => {
        const response = await axios({
          method: "POST",
          url: "https://leetcode.com/graphql",
          data: requestBody,
          headers: this._headers,
          validateStatus: (status: number) => status >= 200 && status < 300,
        });

        return response;
      },
      {
        onRetry: (error, attempt) => {
          if (spinner) {
            spinner.text = `Retrying question detail fetch for ${titleSlug} (attempt ${attempt})...`;
          }
          logger.warn('Retrying question detail fetch', { titleSlug, attempt, error: error.message });
        }
      }
    ).catch((error: AxiosError | Error) => {
      if (spinner) {
        spinner.fail(`Failed to fetch question detail for ${titleSlug}`);
      }
      logger.error('Failed to fetch question detail', { titleSlug, error });

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AuthError('Invalid or expired LeetCode session. Please login again.');
        }
        if (error.response?.status === 404) {
          throw new LeetCodeError(`Question not found: ${titleSlug}`);
        }
        throw new LeetCodeError(
          `Failed to fetch question detail for ${titleSlug}: ${error.message}`,
          { status: error.response?.status, data: error.response?.data }
        );
      }
      throw new LeetCodeError(`Failed to fetch question detail for ${titleSlug}: ${error.message}`);
    });

    // Cache the response data for 24 hours (longer than basic questions since content changes less frequently)
    await CacheManager.set('leetcode', cacheKey, response.data, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    });
    logger.debug('Question detail cached', { titleSlug, cacheKey });

    if (spinner) {
      spinner.succeed(`Fetched question detail for ${titleSlug}`);
    }

    return response;
  };
}

export default LeetCode;
