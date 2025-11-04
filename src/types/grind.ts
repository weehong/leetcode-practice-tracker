export interface GrindQuestion {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  week?: string;
  url: string;
  time: string;
  // Enhanced fields for full question content
  titleSlug?: string; // LeetCode slug for API calls
  content?: string; // HTML content of the problem description
  constraints?: string; // Problem constraints
  codeSnippets?: Array<{
    lang: string;
    langSlug: string;
    code: string;
  }>; // Code templates for different languages
}

export interface GrindConfig {
  weeks: number;
  hours: number;
  grouping: "weeks" | "topics";
  difficulties: Array<"Easy" | "Medium" | "Hard">;
}
