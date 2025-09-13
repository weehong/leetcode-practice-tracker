export type QuestionModel = {
  frontend_id: number;
  title: string;
  title_translated?: string;
  slug: string;
  frequency: number;
  stats: string;
  difficulty: string;
  is_paid_only: boolean;
  tags: string;
  status: string;
};
