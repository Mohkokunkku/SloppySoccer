export const FRONTEND_MODEL = 'eriktonon/deepseek-v4.1-flash-1017:9b';
export interface FrontendWorkerConfig {
  enabled: boolean; provider: string; mode: string;
  endpoint: string; model: string; cloudFallback: boolean; temperature: number;
  numCtx: number; numPredict: number; timeoutMs: number;
}
export interface FrontendTask { id: string; target: string; description: string; requirements: string[] }
export function makeFrontendRequest(config: FrontendWorkerConfig, task: FrontendTask) {
  const url = new URL(config.endpoint);
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname)
    || url.port !== '11434' || url.pathname !== '/api/chat' || url.username || url.password || url.search || url.hash) {
    throw new Error('Frontend worker must use the local Ollama endpoint on port 11434');
  }
  if (!config.enabled || config.provider !== 'ollama' || config.mode !== 'ollama-proposals') throw new Error('Local frontend worker is disabled or misconfigured');
  if (config.cloudFallback !== false) throw new Error('Cloud fallback must remain disabled');
  if (config.model !== FRONTEND_MODEL) throw new Error('Unexpected frontend model');
  if (!Number.isInteger(config.numCtx) || config.numCtx < 2048 || config.numCtx > 8192
    || !Number.isInteger(config.numPredict) || config.numPredict < 128 || config.numPredict > 2048
    || !Number.isInteger(config.timeoutMs) || config.timeoutMs < 1000 || config.timeoutMs > 300000) throw new Error('Worker budget outside allowed limits');
  if (!/^[a-z0-9-]{1,64}$/.test(task.id) || !['src/ui.ts','src/role-hint.ts','src/role-marker.ts'].includes(task.target)
    || task.requirements.length > 10 || JSON.stringify(task).length > 8000) throw new Error('Task exceeds small frontend scope');
  return {
    model: config.model, stream: false as const, think: false,
    keep_alive: '5m', options: { temperature: config.temperature, num_ctx: config.numCtx, num_predict: config.numPredict },
    format: { type: 'object', properties: { code: {type:'string'} }, required:['code'], additionalProperties:false },
    messages: [{ role:'user', content: 'You are a frontend implementation worker. Complete ONLY this one small task. Return JSON {"code":"..."}, no markdown or explanation. You cannot run commands or edit files.\n' + JSON.stringify(task) }],
  };
}
export function parseFrontendProposal(response: unknown, model: string, target = 'src/ui.ts'): string {
  const functionName = target === 'src/ui.ts' ? 'controlledRoleLabel' : target === 'src/role-hint.ts' ? 'roleHint' : target === 'src/role-marker.ts' ? 'roleMarker' : null;
  if (!functionName) throw new Error('Unsupported frontend proposal target');
  if (!response || typeof response !== 'object') throw new Error('Invalid Ollama response');
  const value = response as Record<string,unknown>;
  if (value.model !== model || value.done !== true) throw new Error('Unexpected model or incomplete response');
  const message = value.message as {content?:unknown} | undefined;
  if (typeof message?.content !== 'string') throw new Error('Missing proposal content');
  const candidate = JSON.parse(message.content) as {code?:unknown};
  if (typeof candidate.code !== 'string' || candidate.code.length > 6000
    || !new RegExp('^export function '+functionName+'\\s*\\(').test(candidate.code.trim())
    || (candidate.code.match(/\bexport\b/g)?.length ?? 0) !== 1
    || /\b(import|require|eval|fetch|process|globalThis|document|window)\b/.test(candidate.code)) throw new Error('Proposal exceeds the one-function frontend task');
  // This is a scope precheck, not a sandbox. The architect must read and test
  // candidate code before adding it to source. Never evaluate model output here.
  return candidate.code.trim();
}
