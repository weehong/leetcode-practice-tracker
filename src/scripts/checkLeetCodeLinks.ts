#!/usr/bin/env node

import { LinkChecker, LEETCODE_URLS } from '../utils/linkChecker.js';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';

async function main() {
  console.log('🔍 LeetCode Link Accessibility Checker');
  console.log('=====================================\n');

  const config = ConfigManager.getConfig();
  const sessionId = config.leetcode.sessionId;

  // Collect all LeetCode URLs to check
  const urlsToCheck = [
    LEETCODE_URLS.MAIN_SITE,
    LEETCODE_URLS.GRAPHQL_API,
    LEETCODE_URLS.FAVORITES_API,
    LEETCODE_URLS.LOGIN_PAGE,
    LEETCODE_URLS.PROBLEMS_PAGE,
    ...LEETCODE_URLS.SAMPLE_PROBLEMS,
  ];

  logger.info('Starting LeetCode link accessibility check', {
    urlCount: urlsToCheck.length,
    authenticated: !!sessionId
  });

  console.log(`🔐 Authentication: ${sessionId ? 'Using session ID from environment' : 'No authentication'}\n`);

  const results = await LinkChecker.checkMultipleUrls(urlsToCheck, sessionId);

  // Print detailed results
  LinkChecker.printResults(results);

  // Log results for debugging
  logger.info('Link check completed', {
    total: results.length,
    accessible: results.filter(r => r.accessible).length,
    inaccessible: results.filter(r => !r.accessible).length,
  });

  // Check for critical failures
  const criticalUrls = [
    LEETCODE_URLS.MAIN_SITE,
    LEETCODE_URLS.GRAPHQL_API,
  ];

  const criticalFailures = results.filter(
    result => criticalUrls.includes(result.url) && !result.accessible
  );

  if (criticalFailures.length > 0) {
    console.log('\n🚨 CRITICAL: Essential LeetCode services are not accessible!');
    criticalFailures.forEach(failure => {
      console.log(`   ❌ ${failure.url}: ${failure.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All critical LeetCode services are accessible.');
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Failed to check LeetCode links', error);
    console.error('❌ Error checking LeetCode links:', error.message);
    process.exit(1);
  });
}

export default main;