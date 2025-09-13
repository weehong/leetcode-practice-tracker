import { z } from 'zod';
import { ValidationError } from './errors.js';
import logger from './logger.js';

// Environment variable schemas
export const EnvSchema = z.object({
  LEETCODE_SESSION_ID: z.string().optional(),
  NOTION_TOKEN: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
  NOTION_PAGE_ID: z.string().optional(),
  DATABASE_CONNECTION_STRING: z.string().optional(),
  API_RETRY_ATTEMPTS: z.string().regex(/^\d+$/).transform(Number).optional(),
  API_RETRY_DELAY: z.string().regex(/^\d+$/).transform(Number).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

// Input validation schemas
export const SessionIdSchema = z.string().min(1, 'Session ID cannot be empty');

export const NotionTokenSchema = z.string().min(1, 'Notion token cannot be empty');

export const DatabaseConnectionSchema = z.string().min(1, 'Connection string cannot be empty');

export const CompanySchema = z.enum(['google', 'amazon', 'microsoft', 'facebook', 'apple']);

export const GrindWeeksSchema = z.number().int().min(1).max(26);

export const GrindHoursSchema = z.number().int().min(1).max(40);

export const GrindDifficultySchema = z.array(z.enum(['Easy', 'Medium', 'Hard'])).min(1);

// API response schemas
export const LeetCodeQuestionSchema = z.object({
  frontendQuestionId: z.string(),
  title: z.string(),
  titleSlug: z.string(),
  difficulty: z.string(),
  topicTags: z.array(z.object({
    name: z.string(),
    slug: z.string(),
  })),
  isPaidOnly: z.boolean(),
  acRate: z.number(),
  status: z.string().nullable(),
  freqBar: z.number().nullable(),
});

export const NotionPageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  properties: z.record(z.string(), z.unknown()),
});

// Validation helper function
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.error('Validation failed', { errors: error.issues });
      throw new ValidationError(
        errorMessage || `Validation failed: ${details}`,
        { errors: error.issues }
      );
    }
    throw error;
  }
}

// Safe parse helper
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn('Safe parse failed', { errors: result.error.issues });
  }
  return result;
}