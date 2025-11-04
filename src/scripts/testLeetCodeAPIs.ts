#!/usr/bin/env node

import axios from 'axios';
import ConfigManager from '../config/index.js';
import logger from '../utils/logger.js';

interface APITestResult {
  endpoint: string;
  method: string;
  accessible: boolean;
  status?: number;
  error?: string;
  responseTime: number;
  description: string;
}

async function testLeetCodeAPIs(): Promise<APITestResult[]> {
  const config = ConfigManager.getConfig();
  const sessionId = config.leetcode.sessionId;

  if (!sessionId) {
    console.log('❌ No LeetCode session ID found in environment');
    return [];
  }

  const headers = {
    'Cookie': `LEETCODE_SESSION=${sessionId}`,
    'Content-Type': 'application/json',
    'Referer': 'https://leetcode.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  const tests: Array<{
    endpoint: string;
    method: 'GET' | 'POST';
    data?: any;
    description: string;
  }> = [
    {
      endpoint: 'https://leetcode.com/graphql',
      method: 'POST',
      data: {
        query: `
          query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList(
              categorySlug: $categorySlug
              limit: $limit
              skip: $skip
              filters: $filters
            ) {
              total
              questions {
                acRate
                difficulty
                freqBar
                frontendQuestionId: questionFrontendId
                isFavor
                paidOnly: isPaidOnly
                status
                title
                titleSlug
                topicTags {
                  name
                  id
                  slug
                }
                hasSolution
                hasVideoSolution
              }
            }
          }
        `,
        variables: {
          categorySlug: '',
          skip: 0,
          limit: 1,
          filters: {}
        },
        operationName: 'problemsetQuestionList'
      },
      description: 'GraphQL problemsetQuestionList query (main questions API)'
    },
    {
      endpoint: 'https://leetcode.com/problems/api/favorites/',
      method: 'GET',
      description: 'Favorites API endpoint'
    },
    {
      endpoint: 'https://leetcode.com/graphql',
      method: 'POST',
      data: {
        query: `
          query getQuestionDetail($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              questionId
              questionFrontendId
              title
              titleSlug
              content
              difficulty
              isPaidOnly
              topicTags {
                name
                slug
              }
            }
          }
        `,
        variables: {
          titleSlug: 'two-sum'
        },
        operationName: 'getQuestionDetail'
      },
      description: 'GraphQL question detail query'
    }
  ];

  const results: APITestResult[] = [];

  for (const test of tests) {
    const startTime = Date.now();

    try {
      const response = await axios({
        method: test.method,
        url: test.endpoint,
        headers: headers,
        data: test.data,
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      const responseTime = Date.now() - startTime;
      const accessible = response.status >= 200 && response.status < 400;

      results.push({
        endpoint: test.endpoint,
        method: test.method,
        accessible,
        status: response.status,
        responseTime,
        description: test.description,
      });

      if (accessible && response.data) {
        logger.debug(`API test successful: ${test.description}`, {
          status: response.status,
          dataKeys: Object.keys(response.data)
        });
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      results.push({
        endpoint: test.endpoint,
        method: test.method,
        accessible: false,
        status: error.response?.status,
        error: error.message,
        responseTime,
        description: test.description,
      });
    }
  }

  return results;
}

async function main() {
  console.log('🧪 LeetCode API Functionality Test');
  console.log('===================================\n');

  const config = ConfigManager.getConfig();
  console.log(`🔐 Session ID: ${config.leetcode.sessionId ? 'Available' : 'Missing'}\n`);

  logger.info('Starting LeetCode API functionality test');

  const results = await testLeetCodeAPIs();

  if (results.length === 0) {
    console.log('❌ No tests could be performed - missing session ID');
    return;
  }

  // Print results
  console.log('📊 API Test Results');
  console.log('='.repeat(50));

  const successful = results.filter(r => r.accessible);
  const failed = results.filter(r => !r.accessible);

  console.log(`✅ Working APIs: ${successful.length}`);
  console.log(`❌ Failed APIs: ${failed.length}`);
  console.log(`📈 Total: ${results.length}`);
  console.log(`✨ Success Rate: ${((successful.length / results.length) * 100).toFixed(2)}%\n`);

  if (successful.length > 0) {
    console.log('✅ Working APIs:');
    console.log('-'.repeat(50));
    successful.forEach((result) => {
      console.log(`🟢 ${result.method} ${result.endpoint}`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}ms\n`);
    });
  }

  if (failed.length > 0) {
    console.log('❌ Failed APIs:');
    console.log('-'.repeat(50));
    failed.forEach((result) => {
      console.log(`🔴 ${result.method} ${result.endpoint}`);
      console.log(`   Description: ${result.description}`);
      console.log(`   Status: ${result.status || 'N/A'}`);
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      console.log(`   Response Time: ${result.responseTime}ms\n`);
    });
  }

  // Overall assessment
  if (successful.length === results.length) {
    console.log('🎉 All LeetCode APIs are working correctly!');
  } else if (successful.length > 0) {
    console.log('⚠️  Some LeetCode APIs are working, but others are failing.');
  } else {
    console.log('💥 All LeetCode APIs are failing. Check your session ID or network connection.');
  }

  logger.info('API test completed', {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Failed to test LeetCode APIs', error);
    console.error('❌ Error testing LeetCode APIs:', error.message);
    process.exit(1);
  });
}

export default main;