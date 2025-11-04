#!/usr/bin/env node

import ora from 'ora';
import LeetCode from '../core/leetcode.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';

async function testBrowserFavorites() {
  console.log('🤖 Testing Browser Automation for Favorites API');
  console.log('===============================================\n');

  const config = ConfigManager.getConfig();

  if (!config.leetcode.sessionId) {
    console.log('❌ No LeetCode session ID found in environment');
    console.log('   Please add LEETCODE_SESSION_ID to your .env file');
    return;
  }

  console.log('🔐 Session ID found in environment');
  console.log('🚀 Starting browser automation test...\n');

  const leetcode = new LeetCode();
  leetcode.setSessionId(config.leetcode.sessionId);

  const spinner = ora({
    text: 'Preparing browser automation',
    color: 'green'
  });

  try {
    const result = await leetcode.fetchFavoriteQuestionsWithBrowser(spinner);

    console.log('\n✅ Browser automation successful!');
    console.log('📊 Results:');

    if (Array.isArray(result.data)) {
      console.log(`   • Found ${result.data.length} favorite lists`);

      result.data.forEach((list: any, index: number) => {
        const questionsCount = list.questions?.length || 0;
        const type = list.type === 'leetcode_favorites' ? '🏢 Official' : '👤 Personal';
        console.log(`   ${index + 1}. ${type} "${list.name}" (${questionsCount} questions)`);
      });

      // Show some statistics
      const totalQuestions = result.data.reduce((sum: number, list: any) =>
        sum + (list.questions?.length || 0), 0);
      const officialLists = result.data.filter((list: any) => list.type === 'leetcode_favorites').length;
      const personalLists = result.data.filter((list: any) => list.type === 'private_favorites').length;

      console.log(`\n📈 Summary:`);
      console.log(`   • Total Questions: ${totalQuestions}`);
      console.log(`   • Official Lists: ${officialLists}`);
      console.log(`   • Personal Lists: ${personalLists}`);

    } else {
      console.log('   • Unexpected data format:', typeof result.data);
    }

    logger.info('Browser favorites test completed successfully', {
      listsCount: Array.isArray(result.data) ? result.data.length : 0
    });

  } catch (error: any) {
    console.log('\n❌ Browser automation failed');
    console.log(`   Error: ${error.message}`);

    if (error.message.includes('browser')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   • Ensure Chrome/Chromium is installed');
      console.log('   • Check if you have sufficient memory for browser automation');
      console.log('   • Try running in non-headless mode for debugging');
    }

    logger.error('Browser favorites test failed', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testBrowserFavorites().catch((error) => {
    console.error('❌ Error during browser favorites test:', error.message);
    process.exit(1);
  });
}

export default testBrowserFavorites;