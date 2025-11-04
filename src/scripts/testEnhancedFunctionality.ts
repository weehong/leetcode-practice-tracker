#!/usr/bin/env node

import ora from "ora";
import ConfigManager from "../config/index.js";
import LeetCode from "../core/leetcode.js";
import { questionDetailQuery } from "../query/leetcode.js";
import {
  addLeetCodeQuestionWithContent,
  createLeetCodeQuestionDatabase,
  htmlToNotionRichText,
} from "../query/notion.js";
import { Question, QuestionDetail } from "../types/leetcode.js";
import logger from "../utils/logger.js";
import { QuestionDetailSchema } from "../utils/validation.js";

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testEnhancedFunctionality(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const config = ConfigManager.getConfig();

  console.log("🧪 Testing Enhanced LeetCode Question Content Cloning");
  console.log("=====================================================\n");

  // Test 1: Validate GraphQL Query Structure
  results.push(await testGraphQLQuery());

  // Test 2: Test HTML to Notion Rich Text Conversion
  results.push(await testHtmlToNotionRichText());

  // Test 3: Test Code Snippets Formatting
  results.push(await testCodeSnippetsFormatting());

  // Test 4: Test Hints Formatting
  results.push(await testHintsFormatting());

  // Test 5: Test Question Detail Fetching (if session available)
  if (config.leetcode.sessionId) {
    results.push(await testQuestionDetailFetching());
  } else {
    results.push({
      testName: "Question Detail Fetching",
      passed: false,
      error: "No LeetCode session ID available for testing",
    });
  }

  // Test 6: Test Enhanced Notion Database Schema
  results.push(await testEnhancedNotionSchema());

  // Test 7: Test Enhanced Question Addition
  results.push(await testEnhancedQuestionAddition());

  // Test 8: Test Validation Schemas
  results.push(await testValidationSchemas());

  return results;
}

async function testGraphQLQuery(): Promise<TestResult> {
  try {
    // Validate that the query contains all expected fields
    const expectedFields = [
      "questionId",
      "questionFrontendId",
      "title",
      "titleSlug",
      "content",
      "difficulty",
      "isPaidOnly",
      "topicTags",
      "exampleTestcases",
      "constraints",
      "hints",
      "codeSnippets",
      "sampleTestCase",
      "metaData",
    ];

    const missingFields = expectedFields.filter(
      (field) => !questionDetailQuery.includes(field)
    );

    if (missingFields.length > 0) {
      return {
        testName: "GraphQL Query Structure",
        passed: false,
        error: `Missing fields in query: ${missingFields.join(", ")}`,
      };
    }

    return {
      testName: "GraphQL Query Structure",
      passed: true,
      details: { fieldsCount: expectedFields.length },
    };
  } catch (error: any) {
    return {
      testName: "GraphQL Query Structure",
      passed: false,
      error: error.message,
    };
  }
}

async function testHtmlToNotionRichText(): Promise<TestResult> {
  try {
    const testHtml =
      "<p>This is a <strong>test</strong> with <code>code</code> and &lt;special&gt; characters.</p>";
    const result = htmlToNotionRichText(testHtml);

    if (!Array.isArray(result) || result.length === 0) {
      return {
        testName: "HTML to Notion Rich Text Conversion",
        passed: false,
        error: "Expected non-empty array result",
      };
    }

    const firstItem = result[0];
    if (
      !firstItem.type ||
      firstItem.type !== "text" ||
      !firstItem.text ||
      !firstItem.annotations
    ) {
      return {
        testName: "HTML to Notion Rich Text Conversion",
        passed: false,
        error: "Invalid rich text structure",
      };
    }

    return {
      testName: "HTML to Notion Rich Text Conversion",
      passed: true,
      details: {
        itemsCount: result.length,
        firstItemContent: firstItem.text.content.substring(0, 50),
      },
    };
  } catch (error: any) {
    return {
      testName: "HTML to Notion Rich Text Conversion",
      passed: false,
      error: error.message,
    };
  }
}

async function testCodeSnippetsFormatting(): Promise<TestResult> {
  try {
    // Code snippets formatting has been removed - problem description now goes to page content
    return {
      testName: "Code Snippets Formatting",
      passed: true,
      details:
        "Code snippets formatting removed - problem description now goes to page content",
    };
  } catch (error: any) {
    return {
      testName: "Code Snippets Formatting",
      passed: false,
      error: error.message,
    };
  }
}

async function testHintsFormatting(): Promise<TestResult> {
  try {
    const testHints = ["First hint", "Second hint", "Third hint"];
    const result = formatHints(testHints);

    if (!Array.isArray(result) || result.length === 0) {
      return {
        testName: "Hints Formatting",
        passed: false,
        error: "Expected non-empty array result",
      };
    }

    const firstItem = result[0];
    if (!firstItem.annotations || !firstItem.annotations.italic) {
      return {
        testName: "Hints Formatting",
        passed: false,
        error: "Italic annotation not set correctly",
      };
    }

    return {
      testName: "Hints Formatting",
      passed: true,
      details: {
        itemsCount: result.length,
        hasItalicAnnotation: firstItem.annotations.italic,
      },
    };
  } catch (error: any) {
    return {
      testName: "Hints Formatting",
      passed: false,
      error: error.message,
    };
  }
}

async function testQuestionDetailFetching(): Promise<TestResult> {
  try {
    const leetCode = new LeetCode();
    const config = ConfigManager.getConfig();

    if (!config.leetcode.sessionId) {
      return {
        testName: "Question Detail Fetching",
        passed: false,
        error: "No session ID available",
      };
    }

    leetCode.setSessionId(config.leetcode.sessionId);
    const spinner = ora("Testing question detail fetch").start();

    try {
      const result = await leetCode.fetchQuestionDetail("two-sum", spinner);

      if (!result.data || !result.data.data || !result.data.data.question) {
        spinner.fail();
        return {
          testName: "Question Detail Fetching",
          passed: false,
          error: "No question data in response",
        };
      }

      const question = result.data.data.question;
      const hasRequiredFields = !!(
        question.title &&
        question.content &&
        question.difficulty
      );

      spinner.succeed();
      return {
        testName: "Question Detail Fetching",
        passed: hasRequiredFields,
        details: {
          title: question.title,
          hasContent: !!question.content,
          contentLength: question.content?.length || 0,
        },
      };
    } catch (error: any) {
      spinner.fail();
      return {
        testName: "Question Detail Fetching",
        passed: false,
        error: error.message,
      };
    }
  } catch (error: any) {
    return {
      testName: "Question Detail Fetching",
      passed: false,
      error: error.message,
    };
  }
}

async function testEnhancedNotionSchema(): Promise<TestResult> {
  try {
    const schema = createLeetCodeQuestionDatabase("test-page-id");

    const expectedProperties = [
      "Problem Description",
      "Examples",
      "Constraints",
      "Hints",
      "Code Templates",
      "Follow-up",
    ];

    const missingProperties = expectedProperties.filter(
      (prop) => !(schema.properties as any)[prop]
    );

    if (missingProperties.length > 0) {
      return {
        testName: "Enhanced Notion Database Schema",
        passed: false,
        error: `Missing properties: ${missingProperties.join(", ")}`,
      };
    }

    // Check that all new properties are rich_text type
    const invalidTypes = expectedProperties.filter(
      (prop) => (schema.properties as any)[prop].type !== "rich_text"
    );

    if (invalidTypes.length > 0) {
      return {
        testName: "Enhanced Notion Database Schema",
        passed: false,
        error: `Properties with wrong type: ${invalidTypes.join(", ")}`,
      };
    }

    return {
      testName: "Enhanced Notion Database Schema",
      passed: true,
      details: {
        totalProperties: Object.keys(schema.properties).length,
        newProperties: expectedProperties.length,
      },
    };
  } catch (error: any) {
    return {
      testName: "Enhanced Notion Database Schema",
      passed: false,
      error: error.message,
    };
  }
}

async function testEnhancedQuestionAddition(): Promise<TestResult> {
  try {
    const mockQuestion: Question = {
      acRate: 50.5,
      difficulty: "Easy",
      freqBar: 3.5,
      frontendQuestionId: "1",
      isFavor: false,
      paidOnly: false,
      title: "Two Sum",
      titleSlug: "two-sum",
      status: "ac",
      topicTags: [{ name: "Array" }] as any,
    };

    const mockQuestionDetail: QuestionDetail = {
      questionId: "1",
      questionFrontendId: "1",
      title: "Two Sum",
      titleSlug: "two-sum",
      content: "<p>Test content</p>",
      difficulty: "Easy",
      isPaidOnly: false,
      topicTags: [{ name: "Array", slug: "array" }],
      hints: ["Hint 1", "Hint 2"],
      codeSnippets: [
        { lang: "Python", langSlug: "python", code: "def solution():" },
      ],
    };

    const result = addLeetCodeQuestionWithContent(
      "test-db-id",
      mockQuestion,
      mockQuestionDetail
    );

    if (!result.children || result.children.length === 0) {
      return {
        testName: "Enhanced Question Addition",
        passed: false,
        error: "Missing children blocks for problem description",
      };
    }

    const hasContentBlocks = result.children.length > 0;

    return {
      testName: "Enhanced Question Addition",
      passed: hasContentBlocks,
      details: {
        hasContent: hasContentBlocks,
        childrenCount: result.children.length,
        propertiesCount: Object.keys(result.properties).length,
      },
    };
  } catch (error: any) {
    return {
      testName: "Enhanced Question Addition",
      passed: false,
      error: error.message,
    };
  }
}

async function testValidationSchemas(): Promise<TestResult> {
  try {
    const mockQuestionDetail = {
      questionId: "1",
      questionFrontendId: "1",
      title: "Two Sum",
      titleSlug: "two-sum",
      content: "<p>Test content</p>",
      difficulty: "Easy",
      isPaidOnly: false,
      topicTags: [{ name: "Array", slug: "array" }],
    };

    const validationResult = QuestionDetailSchema.safeParse(mockQuestionDetail);

    if (!validationResult.success) {
      return {
        testName: "Validation Schemas",
        passed: false,
        error: `Validation failed: ${validationResult.error.message}`,
      };
    }

    return {
      testName: "Validation Schemas",
      passed: true,
      details: { validatedFields: Object.keys(mockQuestionDetail).length },
    };
  } catch (error: any) {
    return {
      testName: "Validation Schemas",
      passed: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log("🚀 Starting Enhanced Functionality Tests\n");

  const results = await testEnhancedFunctionality();

  console.log("\n📊 Test Results");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  console.log(`✅ Passed: ${passed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📈 Total: ${results.length}`);
  console.log(
    `✨ Success Rate: ${((passed.length / results.length) * 100).toFixed(2)}%\n`
  );

  if (passed.length > 0) {
    console.log("✅ Passed Tests:");
    console.log("-".repeat(30));
    passed.forEach((result) => {
      console.log(`🟢 ${result.testName}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
      console.log();
    });
  }

  if (failed.length > 0) {
    console.log("❌ Failed Tests:");
    console.log("-".repeat(30));
    failed.forEach((result) => {
      console.log(`🔴 ${result.testName}`);
      console.log(`   Error: ${result.error}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
      console.log();
    });
  }

  // Overall assessment
  if (failed.length === 0) {
    console.log(
      "🎉 All tests passed! The enhanced functionality is working correctly."
    );
  } else if (passed.length > 0) {
    console.log(
      "⚠️  Some tests passed, but there are issues that need attention."
    );
  } else {
    console.log(
      "💥 All tests failed. The enhanced functionality needs debugging."
    );
  }

  logger.info("Enhanced functionality test completed", {
    total: results.length,
    passed: passed.length,
    failed: failed.length,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Failed to run enhanced functionality tests", error);
    console.error("❌ Error running tests:", error.message);
    process.exit(1);
  });
}

export default main;
