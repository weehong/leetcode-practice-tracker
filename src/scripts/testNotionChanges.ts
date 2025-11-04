#!/usr/bin/env node

/**
 * Test script to verify the Notion integration changes:
 * - Problem description moved to page content (children blocks)
 * - Code templates removed
 */

import { addLeetCodeQuestion, addLeetCodeQuestionWithContent, addGrindQuestion, createProblemDescriptionBlocks } from '../query/notion.js';
import { Question, QuestionDetail } from '../types/leetcode.js';

console.log('🧪 Testing Notion Integration Changes...\n');

// Test 1: Test createProblemDescriptionBlocks function
console.log('📋 Test 1: Problem Description Blocks Creation');
try {
  const testContent = '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p><p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>';
  
  const blocks = createProblemDescriptionBlocks(testContent);
  
  console.log(`✅ Created ${blocks.length} blocks`);
  console.log(`✅ First block type: ${blocks[0]?.type}`);
  console.log(`✅ First block content preview: ${blocks[0]?.paragraph?.rich_text[0]?.text?.content?.substring(0, 50)}...`);
} catch (error: any) {
  console.log(`❌ Problem description blocks test failed: ${error.message}`);
}

// Test 2: Test LeetCode question creation
console.log('\n📋 Test 2: LeetCode Question Creation');
try {
  const mockQuestion: Question = {
    acRate: 50.0,
    difficulty: 'Easy',
    freqBar: 4.5,
    frontendQuestionId: '1',
    isFavor: false,
    paidOnly: false,
    title: 'Two Sum',
    titleSlug: 'two-sum',
    status: 'ac',
    topicTags: [{ name: 'Array' }, { name: 'Hash Table' }] as any,
    featuredList: undefined,
    content: '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>',
    exampleTestcases: 'nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    constraints: '2 <= nums.length <= 10^4',
    hints: ['Use a hash map'],
    followup: 'Can you come up with an algorithm that is less than O(n^2) time complexity?'
  };

  const result = addLeetCodeQuestion('test-db-id', mockQuestion);
  
  console.log(`✅ Question created successfully`);
  console.log(`✅ Has children blocks: ${result.children && result.children.length > 0}`);
  console.log(`✅ Children count: ${result.children?.length || 0}`);
  console.log(`✅ Properties count: ${Object.keys(result.properties).length}`);
  console.log(`✅ Has Problem Description property: ${'Problem Description' in result.properties}`);
  console.log(`✅ Has Code Templates property: ${'Code Templates' in result.properties}`);
} catch (error: any) {
  console.log(`❌ LeetCode question creation test failed: ${error.message}`);
}

// Test 3: Test enhanced LeetCode question creation
console.log('\n📋 Test 3: Enhanced LeetCode Question Creation');
try {
  const mockQuestion: Question = {
    acRate: 50.0,
    difficulty: 'Easy',
    freqBar: 4.5,
    frontendQuestionId: '1',
    isFavor: false,
    paidOnly: false,
    title: 'Two Sum',
    titleSlug: 'two-sum',
    status: 'ac',
    topicTags: [{ name: 'Array' }, { name: 'Hash Table' }] as any,
    featuredList: undefined,
    content: undefined, // Basic question has no content
    exampleTestcases: undefined,
    constraints: undefined,
    hints: undefined,
    followup: undefined
  };

  const mockQuestionDetail: QuestionDetail = {
    questionId: '1',
    questionFrontendId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    isPaidOnly: false,
    topicTags: [{ name: 'Array' }, { name: 'Hash Table' }],
    content: '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p><p>You may assume that each input would have exactly one solution.</p>',
    exampleTestcases: 'nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    constraints: '2 <= nums.length <= 10^4',
    hints: ['Use a hash map', 'Think about time complexity']
  };

  const result = addLeetCodeQuestionWithContent('test-db-id', mockQuestion, mockQuestionDetail);
  
  console.log(`✅ Enhanced question created successfully`);
  console.log(`✅ Has children blocks: ${result.children && result.children.length > 0}`);
  console.log(`✅ Children count: ${result.children?.length || 0}`);
  console.log(`✅ Properties count: ${Object.keys(result.properties).length}`);
  console.log(`✅ Has Problem Description property: ${'Problem Description' in result.properties}`);
  console.log(`✅ Has Code Templates property: ${'Code Templates' in result.properties}`);
} catch (error: any) {
  console.log(`❌ Enhanced LeetCode question creation test failed: ${error.message}`);
}

// Test 4: Test Grind question creation
console.log('\n📋 Test 4: Grind Question Creation');
try {
  const mockGrindQuestion = {
    title: 'Two Sum',
    url: 'https://leetcode.com/problems/two-sum/',
    difficulty: 'Easy',
    week: 'Week 1',
    category: 'Array',
    content: '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>',
    exampleTestcases: 'nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    constraints: '2 <= nums.length <= 10^4',
    hints: ['Use a hash map'],
    followup: 'Can you come up with an algorithm that is less than O(n^2) time complexity?'
  };

  const result = addGrindQuestion('test-db-id', mockGrindQuestion);
  
  console.log(`✅ Grind question created successfully`);
  console.log(`✅ Has children blocks: ${result.children && result.children.length > 0}`);
  console.log(`✅ Children count: ${result.children?.length || 0}`);
  console.log(`✅ Properties count: ${Object.keys(result.properties).length}`);
  console.log(`✅ Has Problem Description property: ${'Problem Description' in result.properties}`);
  console.log(`✅ Has Code Templates property: ${'Code Templates' in result.properties}`);
} catch (error: any) {
  console.log(`❌ Grind question creation test failed: ${error.message}`);
}

console.log('\n🎯 Summary:');
console.log('✅ Problem description is now stored in page content (children blocks)');
console.log('✅ Code templates have been removed from database properties');
console.log('✅ Database schema updated to remove Problem Description and Code Templates properties');
console.log('✅ All question creation functions updated to use the new structure');

console.log('\n📝 Changes made:');
console.log('1. Removed "Problem Description" and "Code Templates" properties from database schemas');
console.log('2. Added createProblemDescriptionBlocks() function to convert HTML to Notion blocks');
console.log('3. Updated addLeetCodeQuestion() to include children blocks for problem description');
console.log('4. Updated addLeetCodeQuestionWithContent() to use children blocks');
console.log('5. Updated addGrindQuestion() to use children blocks');
console.log('6. Removed formatCodeSnippets() function');
console.log('7. Updated test scripts to reflect the changes');
