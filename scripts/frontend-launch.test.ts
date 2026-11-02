import {it,expect} from 'vitest';
import {frontendArguments} from './frontend-launch.js';
import team from '../agents/team.json';
it('pins coding worker to Sol with low reasoning without changing the main model',()=>{
  const args=frontendArguments(team.frontend,'D:/folder with spaces/task.txt');
  expect(args).toContain('gpt-6.1-sol'); expect(args).toContain('low');
  expect(args).toContain('openai-codex'); expect(args).not.toContain('deepseek-r1:14b');
  expect(args).not.toContain('--run-budget'); // Gateway CLI does not accept this flag.
  expect(args.at(-1)).toBe('D:/folder with spaces/task.txt');
});
it('refuses disabled, Ollama or unapproved model workers',()=>{
  expect(()=>frontendArguments({...team.frontend,enabled:false},'x')).toThrow();
  expect(()=>frontendArguments({...team.frontend,provider:'custom'},'x')).toThrow();
  expect(()=>frontendArguments({...team.frontend,model:'invented-light-model'},'x')).toThrow();
});
