import { QuestionModel } from "./database.js";
import { Question } from "./leetcode.js";

export type DatabaseArgumentsType = {
  questions: Question[] | QuestionModel[] | any[];
  company?: string;
  callback: (result: boolean) => {};
};

export type MenuOption = {
  [key: string]: QuestionModel[];
};

export type DatabaseOption = {
  [key: string]: {} | undefined | void;
};
