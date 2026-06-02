export interface Question {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  code: string;
  options: string[];
  time_limit_sec: number;
}

export interface QuizAnswer {
  question_id: string;
  answer: string;
  correct: boolean;
  time_spent_ms: number;
}

export interface AICall {
  id: number;
  provider: string;
  model: string;
  prompt: string;
  response: string;
  latency_ms: number;
  success: number;
  created_at: string;
}

export interface EvalEvent {
  event_type: string;
  event_data: any;
  timestamp_ms: number;
}

export interface AIConfig {
  provider: string;
  api_key: string;
  model: string;
  base_url: string;
}

export interface GitConfig {
  platform: 'github' | 'gitee';
  token: string;
  repo_url: string;
}

export interface Session {
  id: string;
  candidate_name: string;
  candidate_email?: string;
  created_at: string;
  status: string;
  total_score?: number;
  report_json?: string;
}

export interface ProviderOption {
  name: string;
  base_url: string;
  models: string[];
  signup_url: string;
}

export const PROVIDERS: Record<string, ProviderOption> = {
  deepseek: {
    name: 'DeepSeek',
    base_url: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    signup_url: 'https://platform.deepseek.com/',
  },
  zhipu: {
    name: '智谱AI',
    base_url: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4'],
    signup_url: 'https://open.bigmodel.cn/',
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    base_url: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    signup_url: 'https://platform.moonshot.cn/',
  },
  openai: {
    name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
    signup_url: 'https://platform.openai.com/',
  },
};
