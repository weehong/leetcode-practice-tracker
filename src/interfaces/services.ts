import { Ora } from 'ora';
import { Question, FavoriteList, QuestionDetail } from '../types/leetcode.js';
import { QuestionModel } from '../types/database.js';
import LeetCode from '../core/leetcode.js';

export interface ILeetCodeService {
  setSessionId(sessionId: string, csrfToken?: string): void;
  fetchQuestion(requestBody: string, spinner: Ora): Promise<any>;
  fetchFavoriteQuestions(spinner: Ora): Promise<any>;
  fetchQuestionDetail(titleSlug: string, spinner?: Ora): Promise<{ data: { data: { question: QuestionDetail } } }>;
}

export interface INotionService {
  setToken(token: string): Promise<void>;
  getRecord(databaseId: string, filter?: any): Promise<any>;
  createNotionDatabase(query: any): Promise<any>;
  notionLeetCodeQuestionHandler(databaseId: string, questions: Question[], spinner: Ora): Promise<number>;
  notionLeetCodeQuestionHandlerWithContent(databaseId: string, questions: Question[], leetCodeService: LeetCode, spinner: Ora, fetchContent?: boolean): Promise<number>;
  grindQuestionHandler(databaseId: string, questions: any[], spinner: Ora): Promise<number>;
}

export interface IDatabaseService {
  setConnectionString(connectionString: string): Promise<boolean | Error>;
  leetCodeQuestion(questions: Question[]): Promise<number | undefined>;
}

export interface IGrindService {
  getQuestions(): Promise<any[]>;
  getQuestionsWithContent(leetCodeService?: LeetCode): Promise<any[]>;
  setLeetCodeService(leetCodeService: LeetCode): void;
}

export interface IInquirerService {
  start(): Promise<any>;
  promptSessionId(): Promise<any>;
  promptCsrfToken(): Promise<any>;
  promptDatabaseSelection(): Promise<any>;
  promptDatabaseConnectionString(): Promise<any>;
  promptNotionToken(): Promise<any>;
  promptNotionDatabaseExists(): Promise<any>;
  promptNotionDatabaseCreation(): Promise<any>;
  promptNotionPage(): Promise<any>;
  promptNotionDatabase(): Promise<any>;
  promptGrindWeeks(): Promise<any>;
  promptGrindHours(): Promise<any>;
  promptGrindDifficulty(): Promise<any>;
  promptGrindGrouping(): Promise<any>;
}