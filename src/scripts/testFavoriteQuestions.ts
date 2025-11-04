#!/usr/bin/env node

import ora from 'ora';
import Terminal from '../core/terminal.js';
import logger from '../utils/logger.js';

async function testFavoriteQuestions() {
  console.log('🌟 Testing Favorite Questions Feature');
  console.log('=====================================\n');

  const terminal = new Terminal();

  try {
    const result = await terminal.questionMenu('fetch-favorite-question');

    console.log('✅ Successfully fetched favorite questions!');
    console.log('📊 Results Summary:');
    console.log(`   • Total Questions: ${result.questions.length}`);

    // Group questions by difficulty
    const difficultyGroups = result.questions.reduce((acc: any, question: any) => {
      acc[question.difficulty] = (acc[question.difficulty] || 0) + 1;
      return acc;
    }, {});

    console.log(`   • By Difficulty:`);
    Object.entries(difficultyGroups).forEach(([difficulty, count]) => {
      const emoji = difficulty === 'Easy' ? '🟢' : difficulty === 'Medium' ? '🟡' : '🔴';
      console.log(`     ${emoji} ${difficulty}: ${count}`);
    });

    // Show some sample questions
    console.log(`\n📝 Sample Questions:`);
    result.questions.slice(0, 5).forEach((question: any, index: number) => {
      const diffEmoji = question.difficulty === 'Easy' ? '🟢' : question.difficulty === 'Medium' ? '🟡' : '🔴';
      const favoriteEmoji = question.isFavor ? '⭐' : '';
      console.log(`   ${index + 1}. ${diffEmoji} ${favoriteEmoji} ${question.title}`);
      console.log(`      💡 Topics: ${question.topicTagsString || 'N/A'}`);
      if (question.featuredList) {
        console.log(`      📋 In Lists: ${question.featuredList}`);
      }
    });

    if (result.questions.length > 5) {
      console.log(`   ... and ${result.questions.length - 5} more questions`);
    }

  } catch (error: any) {
    console.log('❌ Failed to fetch favorite questions');
    console.log(`   Error: ${error.message}`);
    logger.error('Favorite questions test failed', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testFavoriteQuestions().catch((error) => {
    console.error('❌ Error during favorite questions test:', error.message);
    process.exit(1);
  });
}

export default testFavoriteQuestions;