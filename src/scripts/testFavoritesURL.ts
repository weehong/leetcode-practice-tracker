#!/usr/bin/env node

import axios from 'axios';
import logger from '../utils/logger.js';

async function testFavoritesURL() {
  console.log('🔍 Testing LeetCode Favorites URL Access');
  console.log('=======================================\n');

  const url = 'https://leetcode.com/problems/api/favorites/';

  // Test with Chrome-like headers (no authentication)
  const chromeHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Referer': 'https://leetcode.com/problemset/all/',
  };

  console.log('📡 Testing without authentication...');

  try {
    const response = await axios.get(url, {
      headers: chromeHeaders,
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    console.log(`✅ Success! Status: ${response.status}`);
    console.log(`📊 Response size: ${JSON.stringify(response.data).length} characters`);

    if (Array.isArray(response.data)) {
      console.log(`📝 Found ${response.data.length} favorite lists:`);
      response.data.forEach((list: any, index: number) => {
        console.log(`   ${index + 1}. ${list.name} (${list.questions?.length || 0} questions) - ${list.type}`);
      });
    } else {
      console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
    }

    logger.info('Favorites URL test successful', {
      status: response.status,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      size: JSON.stringify(response.data).length
    });

  } catch (error: any) {
    console.log(`❌ Failed! Status: ${error.response?.status || 'No response'}`);
    console.log(`🔍 Error: ${error.message}`);

    if (error.response?.status) {
      console.log(`📜 Response headers:`, error.response.headers);
    }

    logger.warn('Favorites URL test failed', {
      status: error.response?.status,
      message: error.message,
      headers: error.response?.headers
    });
  }

  // Also test a few variations
  const variations = [
    {
      name: 'With different Accept header',
      headers: { ...chromeHeaders, 'Accept': '*/*' }
    },
    {
      name: 'With minimal headers',
      headers: {
        'User-Agent': chromeHeaders['User-Agent'],
        'Accept': 'application/json'
      }
    }
  ];

  for (const variation of variations) {
    console.log(`\n📡 Testing ${variation.name}...`);

    try {
      const response = await axios.get(url, {
        headers: variation.headers,
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      console.log(`✅ Success! Status: ${response.status}`);
      if (Array.isArray(response.data)) {
        console.log(`📝 Found ${response.data.length} favorite lists`);
      }

    } catch (error: any) {
      console.log(`❌ Failed! Status: ${error.response?.status || 'No response'}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testFavoritesURL().catch((error) => {
    console.error('❌ Error during favorites URL test:', error.message);
    process.exit(1);
  });
}

export default testFavoritesURL;