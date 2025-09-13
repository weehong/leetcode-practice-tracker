export interface GrindQuestion {
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  week?: string;
  url: string;
  time: string;
}

export interface GrindConfig {
  weeks: number;
  hours: number;
  grouping: 'weeks' | 'topics';
  difficulties: Array<'Easy' | 'Medium' | 'Hard'>;
}