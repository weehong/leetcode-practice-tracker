#!/usr/bin/env node

/**
 * Enhanced LeetCode Practice Tracker Example
 * 
 * This script demonstrates how to use the new enhanced functionality
 * to fetch complete LeetCode question content and store it in Notion
 * with full problem descriptions, examples, constraints, and hints.
 */

import LeetCode from '../core/leetcode.js';
import Notion from '../core/notion.js';
import { createLeetCodeQuestionDatabase } from '../query/notion.js';
import { questionLeetCodeQuery } from '../query/leetcode.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';
import ora from 'ora';

async function enhancedExample() {
  console.log('🚀 Enhanced LeetCode Practice Tracker Example');
  console.log('============================================\n');

  const config = ConfigManager.getConfig();

  // Check if required configuration is available
  if (!config.leetcode.sessionId) {
    console.log('❌ LeetCode session ID not found. Please set LEETCODE_SESSION in your .env file.');
    console.log('   See README.md for instructions on how to obtain the session ID.');
    return;
  }

  if (!config.notion.token) {
    console.log('❌ Notion token not found. Please set NOTION_TOKEN in your .env file.');
    console.log('   See README.md for instructions on how to obtain the Notion token.');
    return;
  }

  // Initialize services
  const leetCode = new LeetCode();
  const notion = new Notion({ version: config.notion.version });

  // Set up authentication
  leetCode.setSessionId(config.leetcode.sessionId);
  await notion.setToken(config.notion.token);

  console.log('✅ Services initialized and authenticated\n');

  // Step 1: Fetch a small sample of questions
  console.log('📋 Step 1: Fetching sample questions...');
  const spinner = ora('Fetching questions from LeetCode').start();

  try {
    const questionsResponse = await leetCode.fetchQuestion(
      JSON.stringify({
        query: questionLeetCodeQuery,
        variables: {
          categorySlug: "",
          skip: 0,
          limit: 3, // Small sample for demonstration
          filters: {}
        },
        operationName: "problemsetQuestionList",
      }),
      spinner
    );

    const questions = questionsResponse.data.data.problemsetQuestionList.questions;
    console.log(`✅ Fetched ${questions.length} questions\n`);

    // Step 2: Demonstrate fetching detailed content for one question
    console.log('📖 Step 2: Fetching detailed content...');
    const sampleQuestion = questions[0];
    
    console.log(`   Fetching details for: ${sampleQuestion.title}`);
    const detailSpinner = ora(`Getting full content for ${sampleQuestion.title}`).start();
    
    try {
      const detailResponse = await leetCode.fetchQuestionDetail(sampleQuestion.titleSlug, detailSpinner);
      const questionDetail = detailResponse.data.data.question;
      
      console.log('✅ Question detail fetched successfully');
      console.log(`   - Content length: ${questionDetail.content?.length || 0} characters`);
      console.log(`   - Has examples: ${!!questionDetail.exampleTestcases}`);
      console.log(`   - Has constraints: ${!!questionDetail.constraints}`);
      console.log(`   - Number of hints: ${questionDetail.hints?.length || 0}`);
      console.log(`   - Number of code templates: ${questionDetail.codeSnippets?.length || 0}`);
      console.log();

      // Step 3: Show content preview
      if (questionDetail.content) {
        console.log('📄 Step 3: Content Preview');
        const plainContent = questionDetail.content
          .replace(/<[^>]*>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim();
        
        console.log('   Problem Description (first 200 chars):');
        console.log(`   "${plainContent.substring(0, 200)}..."`);
        console.log();
      }

      // Step 4: Show code templates
      if (questionDetail.codeSnippets && questionDetail.codeSnippets.length > 0) {
        console.log('💻 Step 4: Available Code Templates');
        questionDetail.codeSnippets.forEach((snippet, index) => {
          console.log(`   ${index + 1}. ${snippet.lang} (${snippet.langSlug})`);
        });
        console.log();
      }

      // Step 5: Show hints
      if (questionDetail.hints && questionDetail.hints.length > 0) {
        console.log('💡 Step 5: Available Hints');
        questionDetail.hints.forEach((hint, index) => {
          console.log(`   Hint ${index + 1}: ${hint.substring(0, 100)}...`);
        });
        console.log();
      }

    } catch (error: any) {
      detailSpinner.fail(`Failed to fetch question detail: ${error.message}`);
      console.log('   This might be due to authentication issues or rate limiting.\n');
    }

    // Step 6: Demonstrate enhanced Notion integration (if page ID is available)
    if (config.notion.pageId) {
      console.log('📝 Step 6: Enhanced Notion Integration');
      console.log('   Creating enhanced database schema...');
      
      try {
        const databaseSchema = createLeetCodeQuestionDatabase(config.notion.pageId);
        console.log('   ✅ Enhanced schema created with rich content fields:');
        console.log('      - Problem Description (rich text)');
        console.log('      - Examples (rich text)');
        console.log('      - Constraints (rich text)');
        console.log('      - Hints (rich text)');
        console.log('      - Code Templates (rich text)');
        console.log('      - Follow-up (rich text)');
        console.log();

        // Note: We're not actually creating the database here to avoid
        // creating test databases in the user's Notion workspace
        console.log('   📌 Note: Database creation skipped in demo mode');
        console.log('      To create a real database, use the main application.');
        console.log();

      } catch (error: any) {
        console.log(`   ❌ Error with Notion integration: ${error.message}`);
        console.log();
      }
    } else {
      console.log('📝 Step 6: Notion Integration');
      console.log('   ⚠️  No Notion page ID configured. Set NOTION_PAGE_ID to test database creation.');
      console.log();
    }

    // Step 7: Summary and next steps
    console.log('🎯 Step 7: Summary');
    console.log('   The enhanced functionality provides:');
    console.log('   ✅ Complete question content fetching');
    console.log('   ✅ Rich text formatting for Notion');
    console.log('   ✅ Code template storage');
    console.log('   ✅ Hints and constraints preservation');
    console.log('   ✅ Offline-capable problem solving');
    console.log();

    console.log('🚀 Next Steps:');
    console.log('   1. Run the main application: npm start');
    console.log('   2. Choose "LeetCode Questions" from the menu');
    console.log('   3. Select "Notion" as your storage option');
    console.log('   4. The enhanced content will be automatically included!');
    console.log();

    console.log('🎉 Enhanced functionality demonstration completed successfully!');

  } catch (error: any) {
    spinner.fail(`Failed to fetch questions: ${error.message}`);
    console.log('   Please check your LeetCode session ID and try again.');
    logger.error('Enhanced example failed', error);
  }
}

async function main() {
  try {
    await enhancedExample();
  } catch (error: any) {
    console.error('❌ Example failed:', error.message);
    logger.error('Enhanced example script failed', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default enhancedExample;
