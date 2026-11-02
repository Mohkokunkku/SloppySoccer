export interface CodingWorkerConfig {
  enabled: boolean; provider: string; model: string; reasoning: string;
  maxTurns: number; softTimeBudgetSeconds: number; toolsets: string; cloudFallback: boolean;
}
export function frontendArguments(config: CodingWorkerConfig, promptPath: string): string[] {
  if (!config.enabled) throw new Error('Frontend worker is disabled');
  if (config.provider !== 'openai-codex' || config.model !== 'gpt-6.1-sol' || config.reasoning !== 'low') throw new Error('Unapproved coding model or reasoning setting');
  if (config.cloudFallback !== false || config.toolsets !== 'file'
    || !Number.isInteger(config.maxTurns) || config.maxTurns < 1 || config.maxTurns > 3
    || !Number.isInteger(config.softTimeBudgetSeconds) || config.softTimeBudgetSeconds < 10 || config.softTimeBudgetSeconds > 120) throw new Error('Worker exceeds approved small-task limits');
  return ['chat','--oneshot','--provider',config.provider,'--model',config.model,'--reasoning',config.reasoning,
    '--max-turns',String(config.maxTurns),
    '--toolsets',config.toolsets,'--ignore-rules','--ignore-user-config','--format','stream-json','--source','tool','--query-file',promptPath];
}
