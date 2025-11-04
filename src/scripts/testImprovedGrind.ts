#!/usr/bin/env node

/**
 * Test script for improved Grind 75 functionality with progress tracking
 */

import Grind from '../core/grind.js';
import LeetCode from '../core/leetcode.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';

async function testImprovedGrind() {
  console.log('🔍 Test: Improved Grind 75 with Progress Tracking');
  console.log('===============================================\n');

  const config = ConfigManager.getConfig();

  if (!config.leetcode.sessionId) {
    console.log('❌ No LeetCode session ID configured');
    return;
  }

  // Test with a small dataset first
  const grind = new Grind(2, 5, "weeks", ["Easy"]); // Small test set
  const leetCode = new LeetCode();
  leetCode.setSessionId(config.leetcode.sessionId);

  console.log('📋 Testing with small dataset (2 weeks, 5 hours, Easy only)...\n');

  try {
    const startTime = Date.now();
    const enhancedQuestions = await grind.getQuestionsWithContent(leetCode);
    const endTime = Date.now();
    
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`\n⏱️  Total time: ${duration} seconds`);
    
    const questionsWithContent = enhancedQuestions.filter(q => 
      q.content || q.exampleTestcases || q.hints
    );
    
    console.log('\n📊 Results Summary:');
    console.log(`   Total questions: ${enhancedQuestions.length}`);
    console.log(`   With detailed content: ${questionsWithContent.length}`);
    console.log(`   Basic only: ${enhancedQuestions.length - questionsWithContent.length}`);
    console.log(`   Success rate: ${Math.round((questionsWithContent.length / enhancedQuestions.length) * 100)}%`);
    console.log(`   Average time per question: ${Math.round(duration / enhancedQuestions.length * 100) / 100}s`);
    
    if (questionsWithContent.length > 0) {
      console.log('\n✅ Enhanced functionality working correctly!');
      console.log('🚀 Ready to test with larger datasets.');
    } else {
      console.log('\n❌ No detailed content fetched. Check LeetCode session.');
    }
    
  } catch (error: any) {
    console.log('❌ Test failed:', error.message);
    logger.error('Improved Grind test failed', error);
  }
}

async function main() {
  try {
    await testImprovedGrind();
  } catch (error: any) {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default testImprovedGrind;
