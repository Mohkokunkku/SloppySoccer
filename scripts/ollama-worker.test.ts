import { describe,it,expect } from 'vitest';
import { makeFrontendRequest, parseFrontendProposal } from './ollama-worker.js';
const team = {frontend:{enabled:true,provider:'ollama',mode:'ollama-proposals',endpoint:'http://127.0.0.1:11434/api/chat',model:'eriktonon/deepseek-v4.1-flash-1017:9b',cloudFallback:false,temperature:0,numCtx:4096,numPredict:1024,timeoutMs:120000}};
import task from '../agents/frontend-tasks/controlled-role-label.json';
import activeTeam from '../agents/team.json';
describe('local-only frontend worker',()=>{
  it('keeps the local Flash worker disabled with no automatic fallback',()=>{
    expect(activeTeam.frontend.provider).toBe('openai-codex');
    expect(activeTeam.retiredLocalFrontend.model).toBe(team.frontend.model);
    expect(activeTeam.retiredLocalFrontend.enabled).toBe(false);
    expect(activeTeam.retiredLocalFrontend.automaticFallback).toBe(false);
    expect(activeTeam.retiredFrontend.enabled).toBe(false);
  });
  it('rejects disabled, cloud, and retired-model workers',()=>{
    expect(()=>makeFrontendRequest({...team.frontend,enabled:false},task)).toThrow();
    expect(()=>makeFrontendRequest({...team.frontend,provider:'openai-codex'},task)).toThrow();
    expect(()=>makeFrontendRequest({...team.frontend,model:'deepseek-r1:14b'},task)).toThrow();
  });
  it('pins the requested local model and bounds context and generation',()=>{
    const request=makeFrontendRequest(team.frontend,task);
    expect(request.model).toBe('eriktonon/deepseek-v4.1-flash-1017:9b'); expect(request.stream).toBe(false);
    expect(request.options.num_ctx).toBe(4096); expect(request.options.num_predict).toBe(1024);
    expect(request.messages).toHaveLength(1); expect(request.format.type).toBe('object');
  });
  it('refuses non-loopback endpoints instead of silently spending on cloud',()=>{
    expect(()=>makeFrontendRequest({...team.frontend,endpoint:'https://api.example.com/api/chat'},task)).toThrow(/local/i);
    expect(()=>makeFrontendRequest({...team.frontend,cloudFallback:true},task)).toThrow(/fallback/i);
  });
  it('supports the existing tiny role-hint task without allowing arbitrary source targets',()=>{
    const hintTask={...task,id:'role-hint',target:'src/role-hint.ts'};
    expect(makeFrontendRequest(team.frontend,hintTask).model).toBe(team.frontend.model);
    const code="export function roleHint(role: 'attacker' | undefined): string { return 'Keep your shape and support the team.'; }";
    expect(parseFrontendProposal({model:team.frontend.model,done:true,message:{content:JSON.stringify({code})}},team.frontend.model,hintTask.target)).toBe(code);
    expect(()=>makeFrontendRequest(team.frontend,{...task,target:'server/index.ts'})).toThrow();
  });
  it('accepts only a completed code proposal from the exact model and never executes it',()=>{
    const code='export function controlledRoleLabel(state: GameState): string { return "Player"; }';
    const result=parseFrontendProposal({model:team.frontend.model,done:true,message:{content:JSON.stringify({code})}},team.frontend.model);
    expect(result).toBe(code);
    expect(()=>parseFrontendProposal({model:'other',done:true,message:{content:JSON.stringify({code})}},team.frontend.model)).toThrow();
    expect(()=>parseFrontendProposal({model:team.frontend.model,done:false,message:{content:'{}'}},team.frontend.model)).toThrow();
    expect(()=>parseFrontendProposal({model:team.frontend.model,done:true,message:{content:'not json'}},team.frontend.model)).toThrow();
  });
});
