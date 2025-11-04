#!/usr/bin/env node

/**
 * Debug script to test Grind 75 content fetching
 */

import ConfigManager from "../config/index.js";
import Grind from "../core/grind.js";
import LeetCode from "../core/leetcode.js";
import logger from "../utils/logger.js";

async function debugGrindContent() {
  console.log("🔍 Debug: Grind 75 Content Fetching");
  console.log("===================================\n");

  const config = ConfigManager.getConfig();

  // Test 1: Basic Grind 75 scraping
  console.log("📋 Test 1: Basic Grind 75 scraping...");
  const grind = new Grind(1, 5, "weeks", ["Easy"]); // Small test set

  try {
    const basicQuestions = await grind.getQuestions();
    console.log(`✅ Scraped ${basicQuestions.length} basic questions`);

    if (basicQuestions.length > 0) {
      const firstQuestion = basicQuestions[0];
      console.log("\n📄 First question details:");
      console.log(`   Title: ${firstQuestion.title}`);
      console.log(`   Difficulty: ${firstQuestion.difficulty}`);
      console.log(`   URL: ${firstQuestion.url}`);
      console.log(
        `   Title Slug: ${firstQuestion.titleSlug || "Not extracted"}`
      );
      console.log(`   Has Content: ${!!firstQuestion.content}`);
      console.log(`   Has Examples: ${!!firstQuestion.exampleTestcases}`);
      console.log(`   Has Constraints: ${!!firstQuestion.constraints}`);
      console.log(`   Has Hints: ${!!firstQuestion.hints}`);
    }
  } catch (error: any) {
    console.log(`❌ Basic scraping failed: ${error.message}`);
    return;
  }

  // Test 2: Enhanced content fetching (if LeetCode session available)
  if (config.leetcode.sessionId) {
    console.log("\n📋 Test 2: Enhanced content fetching...");

    try {
      const leetCode = new LeetCode();
      leetCode.setSessionId(config.leetcode.sessionId);

      const enhancedQuestions = await grind.getQuestionsWithContent(leetCode);
      console.log(
        `✅ Enhanced fetching completed for ${enhancedQuestions.length} questions`
      );

      const questionsWithContent = enhancedQuestions.filter(
        (q) => q.content || q.exampleTestcases || q.constraints || q.hints
      );

      console.log(
        `📄 Questions with detailed content: ${questionsWithContent.length}`
      );
      console.log(
        `📋 Questions with basic info only: ${
          enhancedQuestions.length - questionsWithContent.length
        }`
      );

      if (questionsWithContent.length > 0) {
        const firstEnhanced = questionsWithContent[0];
        console.log("\n📄 First enhanced question:");
        console.log(`   Title: ${firstEnhanced.title}`);
        console.log(
          `   Content length: ${firstEnhanced.content?.length || 0} chars`
        );
        console.log(`   Has examples: ${!!firstEnhanced.exampleTestcases}`);
        console.log(`   Has constraints: ${!!firstEnhanced.constraints}`);
        console.log(`   Number of hints: ${firstEnhanced.hints?.length || 0}`);
        console.log(
          `   Number of code templates: ${
            firstEnhanced.codeSnippets?.length || 0
          }`
        );

        if (firstEnhanced.content) {
          const preview = firstEnhanced.content
            .replace(/<[^>]*>/g, "")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .trim()
            .substring(0, 200);
          console.log(`   Content preview: "${preview}..."`);
        }
      }
    } catch (error: any) {
      console.log(`❌ Enhanced fetching failed: ${error.message}`);
    }
  } else {
    console.log(
      "\n⚠️  No LeetCode session ID configured. Skipping enhanced content test."
    );
    console.log(
      "   Set LEETCODE_SESSION_ID in your .env file to test detailed content fetching."
    );
  }

  // Test 3: Check Notion formatting functions
  console.log("\n📋 Test 3: Testing Notion formatting...");

  try {
    // Import the formatting functions
    const { htmlToNotionRichText } = await import("../query/notion.js");

    // Test HTML to rich text
    const testHtml =
      "<p>This is a <strong>test</strong> problem with <code>code</code>.</p>";
    const richText = htmlToNotionRichText(testHtml);
    console.log(`✅ HTML to rich text conversion: ${richText.length} items`);

    // Code snippets formatting removed - now problem description goes to page content
    console.log(
      `✅ Code snippets formatting: removed (now problem description goes to page content)`
    );
  } catch (error: any) {
    console.log(`❌ Notion formatting test failed: ${error.message}`);
  }

  console.log("\n🎯 Summary:");
  console.log("1. Check if basic Grind 75 scraping works");
  console.log("2. Check if titleSlug extraction works");
  console.log(
    "3. Check if enhanced content fetching works (with LeetCode session)"
  );
  console.log("4. Check if Notion formatting functions work");
  console.log("\nIf all tests pass but you still see no content in Notion:");
  console.log(
    '- Make sure you selected "Yes" when prompted for detailed content'
  );
  console.log("- Check that your LeetCode session ID is valid");
  console.log("- Verify the Notion database has the rich text columns");
}

async function main() {
  try {
    await debugGrindContent();
  } catch (error: any) {
    console.error("❌ Debug script failed:", error.message);
    logger.error("Grind content debug script failed", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default debugGrindContent;
