export enum ErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOTION_ERROR = 'NOTION_ERROR',
  NOTION_PAGE_NOT_FOUND = 'NOTION_PAGE_NOT_FOUND',
  NOTION_PERMISSION_DENIED = 'NOTION_PERMISSION_DENIED',
  NOTION_INVALID_TOKEN = 'NOTION_INVALID_TOKEN',
  NOTION_SCHEMA_ERROR = 'NOTION_SCHEMA_ERROR',
  LEETCODE_ERROR = 'LEETCODE_ERROR',
  BROWSER_LAUNCH_ERROR = 'BROWSER_LAUNCH_ERROR',
  SCRAPING_ERROR = 'SCRAPING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NETWORK_ERROR, 503, true, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.AUTH_ERROR, 401, true, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.DATABASE_ERROR, 500, true, details);
  }
}

export class NotionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NOTION_ERROR, 500, true, details);
  }
}

export class NotionPageNotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NOTION_PAGE_NOT_FOUND, 404, true, details);
  }
}

export class NotionPermissionError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NOTION_PERMISSION_DENIED, 403, true, details);
  }
}

export class NotionTokenError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NOTION_INVALID_TOKEN, 401, true, details);
  }
}

export class NotionSchemaError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.NOTION_SCHEMA_ERROR, 400, true, details);
  }
}

export class LeetCodeError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.LEETCODE_ERROR, 500, true, details);
  }
}