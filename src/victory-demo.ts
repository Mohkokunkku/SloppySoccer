import './style.css';
import './international.css';
import {createGame} from '../shared/engine';
import {ToyRenderer} from './renderer';
import {GameAudio} from './audio';
import {PostMatchDirector,POST_MATCH_THEME_NAMES} from './post-match';
const host=document.querySelector<HTMLDivElement>('#victory-pitch')!;
const status=document.querySelector<HTMLParagraphElement>('#victory-status')!;
const result=document.querySelector<HTMLSelectElement>('#victory-result')!;
const pause=document.querySelector<HTMLButtonElement>('#victory-pause')!;
const sound=document.querySelector<HTMLButtonElement>('#victory-sound')!;
let state=createGame(),director:PostMatchDirector|null=null,paused=false,last=0,number=0,theme=0;
const audio=new GameAudio(),renderer=new ToyRenderer(host,state);
function show(selected:number):void{
 theme=selected;state=createGame();state.phase='finished';state.timeRemaining=0;
 state.score=result.value==='draw'?{home:1,away:1}:result.value==='home'?{home:2,away:1}:{home:1,away:2};
 director=new PostMatchDirector(state,`rehearsal-${++number}`,()=>selected/3+.01);paused=false;last=0;audio.reset();void audio.unlock();pause.textContent='Pause';
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-theme]'))button.setAttribute('aria-pressed',String(Number(button.dataset.theme)===selected));
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-theme]'))button.addEventListener('click',()=>show(Number(button.dataset.theme)));
result.addEventListener('change',()=>show(theme));
pause.addEventListener('click',()=>{paused=!paused;last=0;if(paused)audio.quiet();pause.textContent=paused?'Resume':'Pause';});
document.querySelector('#victory-skip')!.addEventListener('click',()=>{director?.skip();paused=false;audio.quiet();});
sound.addEventListener('click',()=>{audio.setEnabled(!audio.enabled);sound.textContent=audio.enabled?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(audio.enabled));});
function suspend():void{if(director?.view.active){paused=true;pause.textContent='Resume';}last=0;audio.quiet();}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',()=>audio.quiet());
renderer.start(now=>{
 const dt=last?(now-last)/1000:0;last=now;
 const view=director?.update(dt,paused||document.hidden);
 if(view){if(!paused&&!document.hidden)audio.updatePostMatch(view);status.textContent=`${POST_MATCH_THEME_NAMES[view.theme]} · ${view.winner===null?'Honours even':view.winner==='home'?'Spain wins':'Argentina wins'} · ${paused?'paused':view.segment}`;}
 sound.dataset.active=String(audio.activeCount);sound.dataset.pending=String(audio.pendingCount);sound.dataset.played=String(audio.played);
 renderer.render(state,now,paused,view);
});
