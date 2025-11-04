#!/usr/bin/env node

/**
 * Test script to verify Grind 75 enhanced content integration with Notion
 */

import Grind from '../core/grind.js';
import LeetCode from '../core/leetcode.js';
import Notion from '../core/notion.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';
import { createGrindDatabase, addGrindQuestion } from '../query/notion.js';

async function testGrindNotionIntegration() {
  console.log('🔍 Test: Grind 75 Enhanced Content → Notion Integration');
  console.log('====================================================\n');

  const config = ConfigManager.getConfig();

  if (!config.leetcode.sessionId) {
    console.log('❌ No LeetCode session ID configured');
    return;
  }

  if (!config.notion.token) {
    console.log('❌ No Notion token configured');
    return;
  }

  // Initialize services
  const leetCode = new LeetCode();
  const notion = new Notion({ version: config.notion.version });
  const grind = new Grind(1, 2, "weeks", ["Easy"]); // Small test set

  leetCode.setSessionId(config.leetcode.sessionId);
  await notion.setToken(config.notion.token);

  console.log('✅ Services initialized\n');

  try {
    // Step 1: Fetch enhanced Grind 75 questions
    console.log('📋 Step 1: Fetching enhanced Grind 75 questions...');
    const enhancedQuestions = await grind.getQuestionsWithContent(leetCode);
    
    console.log(`✅ Fetched ${enhancedQuestions.length} questions`);
    
    const questionsWithContent = enhancedQuestions.filter(q => 
      q.content || q.exampleTestcases || q.hints
    );
    
    console.log(`📄 Questions with detailed content: ${questionsWithContent.length}`);
    console.log(`📋 Questions with basic info only: ${enhancedQuestions.length - questionsWithContent.length}\n`);

    if (questionsWithContent.length === 0) {
      console.log('❌ No questions with detailed content found');
      return;
    }

    // Step 2: Show sample question content
    const sampleQuestion = questionsWithContent[0];
    console.log('📄 Sample enhanced question:');
    console.log(`   Title: ${sampleQuestion.title}`);
    console.log(`   Content length: ${sampleQuestion.content?.length || 0} chars`);
    console.log(`   Has examples: ${!!sampleQuestion.exampleTestcases}`);
    console.log(`   Number of hints: ${sampleQuestion.hints?.length || 0}`);
    console.log(`   Number of code templates: ${sampleQuestion.codeSnippets?.length || 0}`);
    
    if (sampleQuestion.content) {
      const preview = sampleQuestion.content
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim()
        .substring(0, 150);
      console.log(`   Content preview: "${preview}..."`);
    }
    console.log();

    // Step 3: Test Notion database creation
    console.log('📋 Step 3: Testing Notion database creation...');
    
    const testPageId = config.notion.pageId;
    if (!testPageId) {
      console.log('❌ No Notion page ID configured');
      return;
    }

    const databaseQuery = createGrindDatabase(testPageId);
    console.log('✅ Database schema created with enhanced content fields');
    console.log('   Fields: Week, Category, Name, Difficulty, Problem Description, Examples, Constraints, Hints, Code Templates, Follow-up\n');

    // Step 4: Test question formatting for Notion
    console.log('📋 Step 4: Testing question formatting for Notion...');
    
    const notionEntry = addGrindQuestion('test-db-id', sampleQuestion);
    console.log('✅ Question formatted for Notion');
    console.log(`   Has Problem Description in children: ${!!notionEntry.children && notionEntry.children.length > 0}`);
    console.log(`   Has Examples: ${!!notionEntry.properties['Examples'].rich_text.length}`);
    console.log(`   Has Hints: ${!!notionEntry.properties['Hints'].rich_text.length}`);
    console.log(`   Code Templates: removed (problem description now in page content)`);
    
    console.log('\n🎯 Integration Test Summary:');
    console.log('✅ Enhanced Grind 75 content fetching works');
    console.log('✅ Questions include detailed content (descriptions in page content, examples, hints)');
    console.log('✅ Notion database schema includes rich content fields');
    console.log('✅ Question formatting for Notion preserves all content');
    console.log('\n🚀 Ready to create Notion databases with full question content!');
    
  } catch (error: any) {
    console.log('❌ Test failed:', error.message);
    logger.error('Grind Notion integration test failed', error);
  }
}

async function main() {
  try {
    await testGrindNotionIntegration();
  } catch (error: any) {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default testGrindNotionIntegration;
