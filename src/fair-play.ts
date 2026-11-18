import type {Player} from '../shared/types';

export const FAIR_PLAY_ROUND_DURATION=1.6;
export const FAIR_PLAY_DURATION=18;
export type FairPlayFrame={positions:Record<string,{x:number;y:number;facing:number}>,pairs:Array<{homeId:string;awayId:string;strength:number;seconds:number}>,completedPairs:Array<{homeId:string;awayId:string}>,stage:'approach'|'greeting'|'departing'|'done',round:number};
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
const smooth=(v:number)=>{const t=clamp(v,0,1);return t*t*(3-2*t)};
export function fairPlayFrame(players:readonly Player[],seconds:number,reducedMotion=false):FairPlayFrame{
 const t=Number.isFinite(seconds)?clamp(seconds,0,FAIR_PLAY_DURATION):0;
 const home=players.filter(p=>p.team==='home').slice().sort((a,b)=>a.id.localeCompare(b.id));
 const away=players.filter(p=>p.team==='away').slice().sort((a,b)=>a.id.localeCompare(b.id));
 const waves=home.length&&away.length?home.length+away.length-1:0;
 const start=2,waveSpan=9*FAIR_PLAY_ROUND_DURATION,roundDuration=waves?waveSpan/waves:FAIR_PLAY_ROUND_DURATION;
 const travel=Math.max(0,t-start),round=clamp(Math.floor(travel/roundDuration),0,Math.max(0,waves-1)),local=travel-round*roundDuration;
 const moving=t>=start&&t<start+waveSpan&&waves>0;
 const phase=local/roundDuration,reach=reducedMotion?1:phase<.3125?smooth((phase-.21875)/.09375):phase<.78125?1:1-smooth((phase-.78125)/.1875);
 const strength=moving?reach:0,d=round-(home.length-1),row=2.3;
 const offsetFor=(diagonal:number)=>(diagonal+(home.length-away.length)/2)*row/2;
 const firstOffset=offsetFor(-(home.length-1)),currentOffset=offsetFor(d);
 const previousOffset=offsetFor(Math.max(-(home.length-1),d-1));
 const offset=t<start?firstOffset:t>=start+waveSpan?offsetFor(away.length-1):reducedMotion?currentOffset:previousOffset+(currentOffset-previousOffset)*smooth(phase/.21875);
 const departing=smooth((t-start-waveSpan)/(FAIR_PLAY_DURATION-start-waveSpan));
 const positions:FairPlayFrame['positions']={},pairs:FairPlayFrame['pairs']=[],completedPairs:FairPlayFrame['completedPairs']=[];
 const homePartners=new Set<string>(),awayPartners=new Set<string>();
 if(moving)for(let i=0;i<home.length;i++){const j=i+d;if(j>=0&&j<away.length){pairs.push({homeId:home[i].id,awayId:away[j].id,strength,seconds:Math.max(0,local-roundDuration*.3125)*2.4});homePartners.add(home[i].id);awayPartners.add(away[j].id);}}
 for(let r=0;r<waves;r++){
  const contactAt=start+r*roundDuration+(reducedMotion?0:roundDuration*.3125);
  if(t+1e-8<contactAt)continue;
  const diagonal=r-(home.length-1);
  for(let i=0;i<home.length;i++){const j=i+diagonal;if(j>=0&&j<away.length)completedPairs.push({homeId:home[i].id,awayId:away[j].id});}
 }
 home.forEach((p,i)=>{const grip=homePartners.has(p.id)?strength:0;positions[p.id]={x:-.72+.32*grip-.5*departing,y:(i-(home.length-1)/2)*row+offset+.35*grip+.8*departing,facing:Math.PI/2*(1-grip)};});
 away.forEach((p,i)=>{const grip=awayPartners.has(p.id)?strength:0;positions[p.id]={x:.72-.32*grip+.5*departing,y:(i-(away.length-1)/2)*row-offset-.35*grip-.8*departing,facing:-Math.PI/2*(1+grip)};});
 return {positions,pairs,completedPairs,stage:t<start?'approach':t<start+waveSpan?'greeting':t<FAIR_PLAY_DURATION?'departing':'done',round};
}
