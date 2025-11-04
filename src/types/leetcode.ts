export type Question = {
  acRate: number;
  difficulty: string;
  freqBar: number;
  frontendQuestionId: string;
  isFavor: boolean;
  paidOnly: boolean;
  title: string;
  titleSlug: string;
  status: string;
  topicTags: TopicTagsProps[] & string;
  topicTagsString?: string;
  featuredList?: string;
  // Extended fields for full question content
  content?: string; // HTML content of the problem description
  constraints?: string; // Problem constraints
  codeSnippets?: CodeSnippet[]; // Code templates for different languages
  sampleTestCase?: string; // Sample test case
  metaData?: string; // Additional metadata
};

export type TopicTagsProps = {
  name: string;
  id?: string;
  slug?: string;
};

export type CodeSnippet = {
  lang: string;
  langSlug: string;
  code: string;
};

export type QuestionDetail = {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: string;
  isPaidOnly: boolean;
  topicTags: TopicTagsProps[];
  constraints?: string;
  codeSnippets?: CodeSnippet[];
  sampleTestCase?: string;
  metaData?: string;
};

export type ProblemsetQuestionList = {
  total: number;
  questions: Question[];
};

export type Data = {
  problemsetQuestionList: ProblemsetQuestionList;
};

export type LeetCodeProps = {
  data: Data;
};

export type FeatureListProps = {
  name: string;
};

export type FavoriteList = {
  id: string;
  name: string;
  questions: number[];
  type: string;
};
