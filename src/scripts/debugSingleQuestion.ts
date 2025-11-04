#!/usr/bin/env node

/**
 * Debug script to test a single LeetCode question detail fetch
 */

import LeetCode from '../core/leetcode.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';

async function debugSingleQuestion() {
  console.log('🔍 Debug: Single LeetCode Question Detail');
  console.log('========================================\n');

  const config = ConfigManager.getConfig();

  if (!config.leetcode.sessionId) {
    console.log('❌ No LeetCode session ID configured');
    return;
  }

  const leetCode = new LeetCode();
  leetCode.setSessionId(config.leetcode.sessionId);

  try {
    console.log('📋 Fetching question detail for "two-sum"...');
    const response = await leetCode.fetchQuestionDetail('two-sum');
    
    console.log('\n📄 Response structure:');
    console.log('- Has data:', !!response.data);
    console.log('- Data keys:', response.data ? Object.keys(response.data) : []);
    console.log('- Has question:', !!response.data?.data?.question);

    if (response.data?.data?.question) {
      console.log('- Question keys:', Object.keys(response.data.data.question));
      console.log('- Has content:', !!response.data.data.question.content);
      console.log('- Content length:', response.data.data.question.content?.length || 0);
    }
    
    console.log('\n📄 Full response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    logger.error('Single question debug failed', error);
  }
}

async function main() {
  try {
    await debugSingleQuestion();
  } catch (error: any) {
    console.error('❌ Debug script failed:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default debugSingleQuestion;
