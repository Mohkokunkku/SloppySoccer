import './style.css';import './international.css';
import {createGame,startGame,stepGame} from '../shared/engine';
import {EMPTY_INPUT,type Team} from '../shared/types';
import {ToyRenderer} from './renderer';import {FixedStepper} from './loop';
import {DANCE_NAMES} from './celebrations';import {TEAMS} from './teams';import {GameAudio} from './audio';
const host=document.querySelector<HTMLDivElement>('#demo-pitch')!;
const status=document.querySelector<HTMLParagraphElement>('#demo-status')!;
let state=createGame();let selected=0;let last=0;let paused=false;const stepper=new FixedStepper();const audio=new GameAudio();
const renderer=new ToyRenderer(host,state);
function show(style:number):void{
 const team=(document.querySelector<HTMLSelectElement>('#demo-team')!.value as Team);selected=style;state=createGame();startGame(state);state.score[team]=style;
 for(const p of state.players.filter(p=>p.team===team)){const slot=Number(p.id.split('-')[1]);p.x=(10+slot*0.7)*(team==='home'?1:-1);p.y=-4+slot*2.5;}
 audio.reset();void audio.unlock();audio.update(state);Object.assign(state.ball,{x:team==='home'?16.4:-16.4,y:0,z:0,vx:0,vy:0,vz:0,ownerId:null});stepGame(state,EMPTY_INPUT,1/60);audio.update(state);
 stepper.reset();last=0;
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-dance]'))button.setAttribute('aria-pressed',String(Number(button.dataset.dance)===style));
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-dance]'))b.addEventListener('click',()=>show(Number(b.dataset.dance)));
document.querySelector('#demo-team')!.addEventListener('change',()=>show(selected));
const sound=document.querySelector<HTMLButtonElement>('#demo-sound')!;sound.addEventListener('click',()=>{audio.setEnabled(!audio.enabled);sound.textContent=audio.enabled?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(audio.enabled));});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=0;stepper.reset();if(paused)audio.quiet();});
renderer.start(now=>{const dt=last?(now-last)/1000:0;last=now;if(!paused&&(state.phase==='goal'||state.phase==='resetting'))stepper.advance(dt,fixed=>{stepGame(state,EMPTY_INPUT,fixed);audio.update(state);});status.dataset.phase=state.phase;status.textContent=state.phase==='goal'?TEAMS[state.lastScorer!].name+' · '+DANCE_NAMES[selected]+' · '+Math.ceil(state.phaseTimer)+'s':state.phase==='resetting'?'Back to kick-off — watch the figures jog into position.':state.phase==='playing'?'Kick-off ready. Choose another celebration.':'Choose a dance.';renderer.render(state,now,paused);});
