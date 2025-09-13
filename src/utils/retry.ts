import logger from './logger.js';
import ConfigManager from '../config/index.js';
import { NetworkError } from './errors.js';

export interface RetryOptions {
  attempts?: number;
  delay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = ConfigManager.getConfig();
  const {
    attempts = config.api.retryAttempts,
    delay = config.api.retryDelay,
    exponentialBackoff = true,
    onRetry = (error, attempt) => {
      logger.warn(`Retry attempt ${attempt}/${attempts}`, {
        error: error.message
      });
    }
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === attempts) {
        logger.error(`All retry attempts failed`, { attempts, error: lastError.message });
        throw new NetworkError(
          `Operation failed after ${attempts} attempts: ${lastError.message}`,
          { originalError: lastError }
        );
      }

      onRetry(lastError, attempt);

      const waitTime = exponentialBackoff
        ? delay * Math.pow(2, attempt - 1)
        : delay;

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

export function createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: Parameters<T>) => withRetry(() => fn(...args), options)) as T;
}