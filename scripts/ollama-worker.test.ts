import { describe,it,expect } from 'vitest';
import { makeFrontendRequest, parseFrontendProposal } from './ollama-worker.js';
const team = {frontend:{endpoint:'http://127.0.0.1:11434/api/chat',model:'deepseek-r1:14b',cloudFallback:false,temperature:0,numCtx:4096,numPredict:1536,timeoutMs:240000}};
import task from '../agents/frontend-tasks/controlled-role-label.json';
describe('local-only frontend worker',()=>{
  it('pins the requested local model and bounds context and generation',()=>{
    const request=makeFrontendRequest(team.frontend,task);
    expect(request.model).toBe('deepseek-r1:14b'); expect(request.stream).toBe(false);
    expect(request.options.num_ctx).toBe(4096); expect(request.options.num_predict).toBe(1536);
    expect(request.messages).toHaveLength(1); expect(request.format.type).toBe('object');
  });
  it('refuses non-loopback endpoints instead of silently spending on cloud',()=>{
    expect(()=>makeFrontendRequest({...team.frontend,endpoint:'https://api.example.com/api/chat'},task)).toThrow(/local/i);
    expect(()=>makeFrontendRequest({...team.frontend,cloudFallback:true},task)).toThrow(/fallback/i);
  });
  it('accepts only a completed code proposal from the exact model and never executes it',()=>{
    const code='export function controlledRoleLabel(state: GameState): string { return "Player"; }';
    const result=parseFrontendProposal({model:'deepseek-r1:14b',done:true,message:{content:JSON.stringify({code})}},team.frontend.model);
    expect(result).toBe(code);
    expect(()=>parseFrontendProposal({model:'other',done:true,message:{content:JSON.stringify({code})}},team.frontend.model)).toThrow();
    expect(()=>parseFrontendProposal({model:team.frontend.model,done:false,message:{content:'{}'}},team.frontend.model)).toThrow();
    expect(()=>parseFrontendProposal({model:team.frontend.model,done:true,message:{content:'not json'}},team.frontend.model)).toThrow();
  });
});
