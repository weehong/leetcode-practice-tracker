import puppeteer from "puppeteer";
import { IGrindService } from "../interfaces/services.js";
import { GrindQuestion } from "../types/grind.js";
import logger from "../utils/logger.js";
import { AppError, ErrorCode } from "../utils/errors.js";
import CacheManager from "../utils/cache.js";

class Grind implements IGrindService {
  private _url: string;
  private _cacheKey: string;

  constructor(
    weeks: number = 8,
    hours: number = 8,
    group: 'weeks' | 'topics',
    difficulties?: Array<'Easy' | 'Medium' | 'Hard'>
  ) {
    let difficultiesQuery = "";
    difficulties?.forEach((difficulty) => {
      difficultiesQuery += `&difficulty=${difficulty}`;
    });
    this._url = `https://www.techinterviewhandbook.org/grind75?weeks=${weeks}&hours=${hours}${difficultiesQuery}&grouping=${group}`;

    // Generate cache key from parameters
    const params = { weeks, hours, group, difficulties: difficulties || [] };
    this._cacheKey = JSON.stringify(params);
  }

  getQuestions = async (): Promise<GrindQuestion[]> => {
    // Check cache first
    const cachedQuestions = await CacheManager.get<GrindQuestion[]>('grind75', this._cacheKey);
    if (cachedQuestions) {
      logger.info('Using cached Grind75 questions', {
        count: cachedQuestions.length,
        cacheKey: this._cacheKey
      });
      return cachedQuestions;
    }

    const questions: GrindQuestion[] = [];
    logger.info('Starting Grind75 question scraping', { url: this._url });

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
          "--disable-gpu"
        ],
      });
    } catch (error) {
      logger.error('Failed to launch browser for Grind75 scraping', error);
      throw new AppError(
        'Unable to launch browser for web scraping. This may be due to missing Chrome dependencies. Please install Chrome or chromium-browser on your system.',
        ErrorCode.BROWSER_LAUNCH_ERROR,
        500,
        true,
        { originalError: error }
      );
    }

    let page;
    try {
      page = await browser.newPage();
      await page.goto(this._url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Click "Show Topics" button if it exists
      try {
        logger.debug('Looking for Show Topics button');

        // Try to find the button using the specific class selector
        const showTopicsButton = await page.$('button.inline-flex.items-center.px-3.py-2.border.border-gray-300');

        if (showTopicsButton) {
          // Verify it's the right button by checking text content
          const buttonText = await showTopicsButton.evaluate(el => el.textContent?.trim());
          if (buttonText === 'Show topics') {
            logger.info('Found and clicking Show Topics button');
            await showTopicsButton.click();
            // Wait for content to load after clicking
            await new Promise(resolve => setTimeout(resolve, 2000));
            logger.debug('Show Topics button clicked, waiting for content to load');
          } else {
            logger.debug(`Button found but text doesn't match: "${buttonText}"`);
          }
        } else {
          // Fallback: search through all buttons
          logger.debug('Specific selector not found, searching through all buttons');
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const text = await button.evaluate(el => el.textContent?.trim());
            if (text === 'Show topics') {
              logger.info('Found Show Topics button via fallback method, clicking');
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 2000));
              logger.debug('Show Topics button clicked via fallback');
              break;
            }
          }
        }
      } catch (buttonError: any) {
        logger.warn('Could not find or click Show Topics button, proceeding with current view', { error: buttonError?.message || 'Unknown error' });
      }

    // Find all question containers that are currently visible
    const contents = await page.$$('div[role="listitem"]');
    logger.debug(`Found ${contents.length} question items to process`);

    for (const content of contents) {
      try {
        const title = await content.$eval(
          "a",
          (c: any) => c.textContent?.trim() || ''
        ).catch(() => '');

        const difficulty = await content.$eval(
          "span",
          (c: any) => {
            const text = c.textContent?.trim() || '';
            if (text.includes('Easy')) return 'Easy';
            if (text.includes('Medium')) return 'Medium';
            if (text.includes('Hard')) return 'Hard';
            return 'Medium';
          }
        ).catch(() => 'Medium') as 'Easy' | 'Medium' | 'Hard';

        const url = await content.$eval("a", (c: any) =>
          c.getAttribute("href") || c.href || ''
        ).catch(() => '');

        const time = await content.$eval(
          "span:last-child",
          (c: any) => c.textContent?.trim() || ''
        ).catch(() => '');

        // Try to find the category/topic for this specific question
        // Look for the closest heading or topic section
        let category = '';
        try {
          // Find the parent container and look for associated category information
          const categoryElement = await content.evaluate((element) => {
            // Look for a parent section that might contain category information
            let parent = element.parentElement;
            while (parent) {
              // Look for category indicators in the parent hierarchy
              const categoryText = parent.querySelector('h2, h3, [data-testid*="topic"], [class*="topic"]');
              if (categoryText && categoryText.textContent) {
                return categoryText.textContent.trim();
              }
              parent = parent.parentElement;
              // Limit the search to avoid going too far up
              if (!parent || parent.tagName === 'BODY') break;
            }
            return '';
          });
          category = categoryElement || '';
        } catch (categoryError) {
          logger.debug('Could not determine category for question', { title, error: categoryError });
          category = '';
        }

        if (title && url) {
          // Avoid duplicate questions
          const existingQuestion = questions.find(q => q.title === title && q.url === url);
          if (!existingQuestion) {
            questions.push({
              title,
              difficulty,
              url,
              category: category || 'Uncategorized',
              time: time || '',
            } as GrindQuestion);

            logger.debug(`Successfully scraped question: ${title}`, { category, difficulty });
          }
        }
      } catch (questionError) {
        logger.debug('Error processing individual question', questionError);
        continue;
      }
    }
    } catch (error) {
      logger.error('Error during Grind75 scraping', error);
      throw new AppError(
        'Failed to scrape questions from Grind75. Please check your internet connection and try again.',
        ErrorCode.SCRAPING_ERROR,
        500,
        true,
        { originalError: error, url: this._url }
      );
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    logger.info(`Successfully scraped ${questions.length} questions from Grind75`);

    // Cache the results for 24 hours
    if (questions.length > 0) {
      await CacheManager.set('grind75', this._cacheKey, questions, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      });
      logger.debug('Grind75 questions cached', { count: questions.length, cacheKey: this._cacheKey });
    }

    return questions;
  };
}

export default Grind;
