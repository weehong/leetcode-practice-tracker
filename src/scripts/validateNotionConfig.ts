#!/usr/bin/env node

/**
 * Notion Configuration Validator
 * 
 * This script validates your Notion configuration and provides helpful
 * guidance for fixing common issues with page IDs and integration setup.
 */

import ConfigManager, { ConfigManager as ConfigManagerClass } from '../config/index.js';
import Notion from '../core/notion.js';
import logger from '../utils/logger.js';
import ora from 'ora';

async function validateNotionConfig() {
  console.log('🔍 Notion Configuration Validator');
  console.log('=================================\n');

  const config = ConfigManager.getConfig();

  // Step 1: Check if Notion token is configured
  console.log('📋 Step 1: Checking Notion Token...');
  if (!config.notion.token) {
    console.log('❌ NOTION_TOKEN not found in .env file');
    console.log('\n🔧 How to fix:');
    console.log('1. Go to https://www.notion.so/my-integrations');
    console.log('2. Create a new integration or use an existing one');
    console.log('3. Copy the "Internal Integration Token"');
    console.log('4. Add it to your .env file: NOTION_TOKEN=your_token_here');
    console.log('5. Token should start with "secret_" or "ntn_"');
    return;
  }
  console.log('✅ Notion token found\n');

  // Step 2: Check if page ID is configured
  console.log('📋 Step 2: Checking Notion Page ID...');
  if (!config.notion.pageId) {
    console.log('❌ NOTION_PAGE_ID not found in .env file');
    console.log('\n🔧 How to fix:');
    console.log('1. Open your Notion page in a browser');
    console.log('2. Copy the URL (e.g., https://notion.so/workspace/29c101ff533e8008af26fc6b4ab89660)');
    console.log('3. Extract the 32-character ID from the URL');
    console.log('4. Add it to your .env file: NOTION_PAGE_ID=your_page_id_here');
    return;
  }

  // Step 3: Validate page ID format
  console.log('📋 Step 3: Validating Page ID Format...');
  try {
    const validatedPageId = ConfigManagerClass.validateNotionId(config.notion.pageId, 'page');
    console.log(`✅ Page ID format is valid: ${validatedPageId}\n`);
  } catch (error: any) {
    console.log('❌ Invalid page ID format');
    console.log(`\n${error.message}\n`);
    return;
  }

  // Step 4: Test Notion integration
  console.log('📋 Step 4: Testing Notion Integration...');
  const notion = new Notion({ version: config.notion.version });
  
  try {
    await notion.setToken(config.notion.token);
    console.log('✅ Notion token set successfully');

    const spinner = ora('Validating integration permissions').start();
    await notion.validateIntegration();
    spinner.succeed('Integration validation successful');

  } catch (error: any) {
    console.log('❌ Integration validation failed');
    console.log(`\nError: ${error.message}\n`);
    
    if (error.message.includes('401')) {
      console.log('🔧 Possible solutions:');
      console.log('1. Check that your NOTION_TOKEN is correct');
      console.log('2. Make sure the token starts with "secret_" or "ntn_"');
      console.log('3. Verify the integration hasn\'t been revoked');
    }
    return;
  }

  // Step 5: Test page access
  console.log('\n📋 Step 5: Testing Page Access...');
  const spinner = ora('Validating page access').start();
  
  try {
    await notion.validatePage(config.notion.pageId);
    spinner.succeed('Page access validation successful');
    
    console.log('\n🎉 All validations passed!');
    console.log('Your Notion configuration is correct and ready to use.');
    
  } catch (error: any) {
    spinner.fail('Page access validation failed');
    console.log(`\nError: ${error.message}\n`);
    
    if (error.message.includes('400')) {
      console.log('🔧 Page ID format issue:');
      console.log('1. Make sure you\'re using the page ID, not the database ID');
      console.log('2. Remove any dashes from the ID');
      console.log('3. The ID should be exactly 32 characters');
      console.log(`4. Current ID: ${config.notion.pageId}`);
    } else if (error.message.includes('404')) {
      console.log('🔧 Page not found:');
      console.log('1. Check that the page ID is correct');
      console.log('2. Make sure the page exists in your Notion workspace');
      console.log('3. Verify the page is shared with your integration');
    } else if (error.message.includes('403')) {
      console.log('🔧 Permission denied:');
      console.log('1. Share the page with your Notion integration');
      console.log('2. Make sure the integration has the necessary permissions');
      console.log('3. Check that the integration is enabled in your workspace');
    }
    
    console.log('\n📖 Detailed setup guide:');
    console.log('1. Go to your Notion page');
    console.log('2. Click "Share" in the top right');
    console.log('3. Click "Invite" and search for your integration name');
    console.log('4. Select your integration and click "Invite"');
    console.log('5. Make sure it has "Can edit" permissions');
  }
}

async function main() {
  try {
    await validateNotionConfig();
  } catch (error: any) {
    console.error('❌ Validation script failed:', error.message);
    logger.error('Notion config validation script failed', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default validateNotionConfig;
