import puppeteer from "puppeteer";
import { IGrindService } from "../interfaces/services.js";
import { GrindQuestion } from "../types/grind.js";
import CacheManager from "../utils/cache.js";
import { AppError, ErrorCode } from "../utils/errors.js";
import logger from "../utils/logger.js";
import LeetCode from "./leetcode.js";

class Grind implements IGrindService {
  private _url: string;
  private _cacheKey: string;
  private _leetCodeService?: LeetCode;

  constructor(
    weeks: number = 8,
    hours: number = 8,
    group: "weeks" | "topics",
    difficulties?: Array<"Easy" | "Medium" | "Hard">
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

  // Set LeetCode service for fetching detailed content
  setLeetCodeService(leetCodeService: LeetCode): void {
    this._leetCodeService = leetCodeService;
  }

  // Extract LeetCode slug from URL
  private extractLeetCodeSlug(url: string): string | null {
    try {
      // Handle different URL formats:
      // https://leetcode.com/problems/two-sum/
      // https://leetcode.com/problems/two-sum
      const match = url.match(/leetcode\.com\/problems\/([^\/\?]+)/);
      return match ? match[1] : null;
    } catch (error) {
      logger.debug("Failed to extract LeetCode slug from URL", { url, error });
      return null;
    }
  }

  getQuestions = async (): Promise<GrindQuestion[]> => {
    // Check cache first
    const cachedQuestions = await CacheManager.get<GrindQuestion[]>(
      "grind75",
      this._cacheKey
    );
    if (cachedQuestions) {
      logger.info("Using cached Grind75 questions", {
        count: cachedQuestions.length,
        cacheKey: this._cacheKey,
      });
      return cachedQuestions;
    }

    const questions: GrindQuestion[] = [];
    logger.info("Starting Grind75 question scraping", { url: this._url });

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
        ],
      });
    } catch (error) {
      logger.error("Failed to launch browser for Grind75 scraping", error);
      throw new AppError(
        "Unable to launch browser for web scraping. This may be due to missing Chrome dependencies. Please install Chrome or chromium-browser on your system.",
        ErrorCode.BROWSER_LAUNCH_ERROR,
        500,
        true,
        { originalError: error }
      );
    }

    let page;
    try {
      page = await browser.newPage();
      await page.goto(this._url, { waitUntil: "networkidle2", timeout: 30000 });

      // Click "Show Topics" button if it exists
      try {
        logger.debug("Looking for Show Topics button");

        // Try to find the button using the specific class selector
        const showTopicsButton = await page.$(
          "button.inline-flex.items-center.px-3.py-2.border.border-gray-300"
        );

        if (showTopicsButton) {
          // Verify it's the right button by checking text content
          const buttonText = await showTopicsButton.evaluate((el) =>
            el.textContent?.trim()
          );
          if (buttonText === "Show topics") {
            logger.info("Found and clicking Show Topics button");
            await showTopicsButton.click();
            // Wait for content to load after clicking
            await new Promise((resolve) => setTimeout(resolve, 2000));
            logger.debug(
              "Show Topics button clicked, waiting for content to load"
            );
          } else {
            logger.debug(
              `Button found but text doesn't match: "${buttonText}"`
            );
          }
        } else {
          // Fallback: search through all buttons
          logger.debug(
            "Specific selector not found, searching through all buttons"
          );
          const buttons = await page.$$("button");
          for (const button of buttons) {
            const text = await button.evaluate((el) => el.textContent?.trim());
            if (text === "Show topics") {
              logger.info(
                "Found Show Topics button via fallback method, clicking"
              );
              await button.click();
              await new Promise((resolve) => setTimeout(resolve, 2000));
              logger.debug("Show Topics button clicked via fallback");
              break;
            }
          }
        }
      } catch (buttonError: any) {
        logger.warn(
          "Could not find or click Show Topics button, proceeding with current view",
          { error: buttonError?.message || "Unknown error" }
        );
      }

      // Find all question containers that are currently visible
      const contents = await page.$$('div[role="listitem"]');
      logger.debug(`Found ${contents.length} question items to process`);

      for (const content of contents) {
        try {
          const title = await content
            .$eval("a", (c: any) => c.textContent?.trim() || "")
            .catch(() => "");

          const difficulty = (await content
            .$eval("span", (c: any) => {
              const text = c.textContent?.trim() || "";
              if (text.includes("Easy")) return "Easy";
              if (text.includes("Medium")) return "Medium";
              if (text.includes("Hard")) return "Hard";
              return "Medium";
            })
            .catch(() => "Medium")) as "Easy" | "Medium" | "Hard";

          const url = await content
            .$eval("a", (c: any) => c.getAttribute("href") || c.href || "")
            .catch(() => "");

          const time = await content
            .$eval("span:last-child", (c: any) => c.textContent?.trim() || "")
            .catch(() => "");

          // Try to find the category/topic for this specific question
          // Look for the closest heading or topic section
          let category = "";
          try {
            // Find the parent container and look for associated category information
            const categoryElement = await content.evaluate((element) => {
              // Look for a parent section that might contain category information
              let parent = element.parentElement;
              while (parent) {
                // Look for category indicators in the parent hierarchy
                const categoryText = parent.querySelector(
                  'h2, h3, [data-testid*="topic"], [class*="topic"]'
                );
                if (categoryText && categoryText.textContent) {
                  return categoryText.textContent.trim();
                }
                parent = parent.parentElement;
                // Limit the search to avoid going too far up
                if (!parent || parent.tagName === "BODY") break;
              }
              return "";
            });
            category = categoryElement || "";
          } catch (categoryError) {
            logger.debug("Could not determine category for question", {
              title,
              error: categoryError,
            });
            category = "";
          }

          if (title && url) {
            // Avoid duplicate questions
            const existingQuestion = questions.find(
              (q) => q.title === title && q.url === url
            );
            if (!existingQuestion) {
              // Extract LeetCode slug for detailed content fetching
              const titleSlug = this.extractLeetCodeSlug(url);

              const grindQuestion: GrindQuestion = {
                title,
                difficulty,
                url,
                category: category || "Uncategorized",
                time: time || "",
                titleSlug: titleSlug || undefined,
              };

              questions.push(grindQuestion);
              logger.debug(`Successfully scraped question: ${title}`, {
                category,
                difficulty,
                titleSlug,
              });
            }
          }
        } catch (questionError) {
          logger.debug("Error processing individual question", questionError);
          continue;
        }
      }
    } catch (error) {
      logger.error("Error during Grind75 scraping", error);
      throw new AppError(
        "Failed to scrape questions from Grind75. Please check your internet connection and try again.",
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

    logger.info(
      `Successfully scraped ${questions.length} questions from Grind75`
    );

    // Cache the results for 24 hours
    if (questions.length > 0) {
      await CacheManager.set("grind75", this._cacheKey, questions, {
        ttl: 24 * 60 * 60 * 1000, // 24 hours
      });
      logger.debug("Grind75 questions cached", {
        count: questions.length,
        cacheKey: this._cacheKey,
      });
    }

    return questions;
  };

  // Enhanced method to get questions with detailed content
  getQuestionsWithContent = async (
    leetCodeService?: LeetCode
  ): Promise<GrindQuestion[]> => {
    // First get basic questions
    const basicQuestions = await this.getQuestions();

    // If no LeetCode service provided, return basic questions
    if (!leetCodeService) {
      logger.info(
        "No LeetCode service provided, returning basic questions only"
      );
      return basicQuestions;
    }

    const totalQuestions = basicQuestions.length;
    logger.info(
      `Fetching detailed content for ${totalQuestions} Grind75 questions`
    );

    // Warn if this is a large dataset
    if (totalQuestions > 50) {
      console.log(
        `⚠️  Large dataset detected (${totalQuestions} questions). This may take several minutes...`
      );
      console.log(
        "💡 Consider using smaller parameters (fewer weeks/hours) for faster results."
      );
    }

    const questionsWithContent: GrindQuestion[] = [];
    let successCount = 0;
    let failCount = 0;
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 5;

    for (let i = 0; i < basicQuestions.length; i++) {
      const question = basicQuestions[i];
      const progress = `[${i + 1}/${totalQuestions}]`;

      try {
        if (question.titleSlug) {
          // Show progress every 10 questions or for large datasets
          if (i % 10 === 0 || totalQuestions > 50) {
            console.log(`${progress} Fetching content for: ${question.title}`);
          }

          logger.debug(
            `${progress} Fetching detailed content for: ${question.title}`,
            { titleSlug: question.titleSlug }
          );

          // Add timeout wrapper for individual requests
          const fetchWithTimeout = async () => {
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Request timeout")), 30000); // 30 second timeout
            });

            const fetchPromise = leetCodeService.fetchQuestionDetail(
              question.titleSlug!
            );
            return Promise.race([fetchPromise, timeoutPromise]);
          };

          // Fetch detailed content from LeetCode with timeout
          const detailResponse = (await fetchWithTimeout()) as any;
          const questionDetail = detailResponse.data.data.question;

          logger.debug(`${progress} Successfully fetched detailed content`, {
            titleSlug: question.titleSlug,
            hasContent: !!questionDetail.content,
            contentLength: questionDetail.content?.length || 0,
            hasCodeSnippets: !!questionDetail.codeSnippets?.length,
            codeSnippetsCount: questionDetail.codeSnippets?.length || 0,
          });

          // Merge basic question with detailed content
          const enhancedQuestion: GrindQuestion = {
            ...question,
            content: questionDetail.content,
            constraints: questionDetail.constraints,
            codeSnippets: questionDetail.codeSnippets,
          };

          questionsWithContent.push(enhancedQuestion);
          successCount++;
          consecutiveFailures = 0; // Reset consecutive failure counter

          logger.debug(
            `${progress} Successfully fetched content for: ${question.title}`
          );

          // Progressive delay based on dataset size and failure rate
          const baseDelay = totalQuestions > 100 ? 500 : 200; // Longer delay for large datasets
          const failureMultiplier = failCount > 10 ? 2 : 1; // Slow down if many failures
          const delay = baseDelay * failureMultiplier;

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // No titleSlug available, add basic question
          questionsWithContent.push(question);
          logger.debug(
            `${progress} No titleSlug available for: ${question.title}, adding basic question`
          );
        }
      } catch (error: any) {
        // If detailed content fetch fails, add basic question
        questionsWithContent.push(question);
        failCount++;
        consecutiveFailures++;

        logger.warn(
          `${progress} Failed to fetch detailed content for: ${question.title}`,
          {
            error: error.message,
            titleSlug: question.titleSlug,
            consecutiveFailures,
          }
        );

        // If too many consecutive failures, warn user and consider stopping
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(
            `\n⚠️  ${maxConsecutiveFailures} consecutive failures detected. This might indicate:`
          );
          console.log("   • LeetCode session has expired");
          console.log("   • Rate limiting is active");
          console.log("   • Network connectivity issues");
          console.log(
            "\n💡 Continuing with basic questions only for remaining items...\n"
          );

          // Add remaining questions as basic questions
          for (let j = i + 1; j < basicQuestions.length; j++) {
            questionsWithContent.push(basicQuestions[j]);
          }
          break;
        }

        // Add extra delay after failures
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const finalSuccessCount = questionsWithContent.filter(
      (q) => q.content || q.codeSnippets
    ).length;
    const finalBasicCount = questionsWithContent.length - finalSuccessCount;

    logger.info(`Grind75 content fetching completed`, {
      total: totalQuestions,
      withContent: finalSuccessCount,
      failed: failCount,
      basicOnly: finalBasicCount,
    });

    console.log(`\n✅ Content fetching completed:`);
    console.log(`   📄 ${finalSuccessCount} questions with detailed content`);
    console.log(`   📋 ${finalBasicCount} questions with basic info only`);
    console.log(`   ❌ ${failCount} fetch failures\n`);

    return questionsWithContent;
  };
}

export default Grind;
