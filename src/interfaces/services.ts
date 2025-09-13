import { Ora } from 'ora';
import { Question, FavoriteList } from '../types/leetcode.js';
import { QuestionModel } from '../types/database.js';

export interface ILeetCodeService {
  setSessionId(sessionId: string): void;
  fetchQuestion(requestBody: string, spinner: Ora): Promise<any>;
  fetchFavoriteQuestions(spinner: Ora): Promise<any>;
}

export interface INotionService {
  setToken(token: string): Promise<void>;
  getRecord(databaseId: string, filter?: any): Promise<any>;
  createNotionDatabase(query: any): Promise<any>;
  notionLeetCodeQuestionHandler(databaseId: string, questions: Question[], spinner: Ora): Promise<number>;
  grindQuestionHandler(databaseId: string, questions: any[], spinner: Ora): Promise<number>;
}

export interface IDatabaseService {
  setConnectionString(connectionString: string): Promise<boolean | Error>;
  leetCodeQuestion(questions: Question[]): Promise<number | undefined>;
}

export interface IGrindService {
  getQuestions(): Promise<any[]>;
}

export interface IInquirerService {
  start(): Promise<any>;
  promptSessionId(): Promise<any>;
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