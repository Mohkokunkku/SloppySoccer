import type {InputState,LocalSeat} from '../shared/types';
import {EMPTY_INPUT} from '../shared/types';
import {normalizeSeats} from '../shared/local-controls';
import {DEFAULT_TUNING} from '../shared/tuning';
import type {ActionGroup} from './local-input-queue';
type PadReader=()=>readonly(Gamepad|null)[];
const layouts={keyboard1:['KeyA','KeyD','KeyW','KeyS','Space','KeyE','KeyQ','ShiftLeft'],keyboard2:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Slash','Period','ShiftRight']};
const group=(patch:Partial<ActionGroup>):ActionGroup=>({shoot:false,pass:false,switchPlayer:false,...patch});
const ratio=(ms:number,duration:number)=>Number.isFinite(ms)?Math.max(0,Math.min(1,ms/duration)):0;
export class LocalInputHub {
 private seats=normalizeSeats(undefined);
 private keys=new Set<string>();private edges=new Set<string>();
 private pointers=new Map<number,string>();private blockedKeys=new Set<string>();private blockedPointers=new Set<number>();
 private padHeld=new Map<number,Set<number>>();private blockedPadButtons=new Map<number,Set<number>>();
 private events:{seatId:string;group:ActionGroup}[]=[];
 private charges=new Map<string,{start:number;duration:number;sources:Set<string>}>();
 constructor(private readonly readPads:PadReader=()=>typeof navigator==='undefined'||!navigator.getGamepads?[]:navigator.getGamepads(),private readonly now:()=>number=()=>performance.now(),private readonly readChargeTime:()=>number=()=>DEFAULT_TUNING.shotChargeTime){}
 setSeats(seats:LocalSeat[]):void{this.clear();this.seats=normalizeSeats(seats);}
 clear():void{
  this.events=[];this.charges.clear();
  for(const code of this.keys)this.blockedKeys.add(code);
  for(const id of this.pointers.keys())this.blockedPointers.add(id);
  this.edges.clear();
  for(const pad of this.readPads())if(pad){const buttons=this.buttons(pad);this.padHeld.set(pad.index,buttons);this.blockedPadButtons.set(pad.index,new Set(buttons));}
 }
 private begin(seatId:string,source:string):void{
  let charge=this.charges.get(seatId);
  if(!charge){const seconds=this.readChargeTime();charge={start:this.now(),duration:(Number.isFinite(seconds)?Math.max(.2,Math.min(2,seconds)):DEFAULT_TUNING.shotChargeTime)*1000,sources:new Set()};this.charges.set(seatId,charge);this.events.push({seatId,group:group({chargeStart:true})});}
  charge.sources.add(source);
 }
 private end(seatId:string,source:string):void{
  const charge=this.charges.get(seatId);if(!charge?.sources.delete(source))return;
  if(!charge.sources.size){this.events.push({seatId,group:group({shoot:true,shotCharge:ratio(this.now()-charge.start,charge.duration)})});this.charges.delete(seatId);}
 }
 private observed(code:string,source:string,touch:boolean,down:boolean):void{
  const seats=touch?this.seats.slice(0,1):this.seats.filter(s=>s.device==='keyboard1'||s.device==='keyboard2');
  for(const seat of seats){const codes=touch?layouts.keyboard1:layouts[seat.device as 'keyboard1'|'keyboard2'];
   if(code===codes[4]){if(down)this.begin(seat.id,source);else this.end(seat.id,source);}
   else if(down&&(code===codes[5]||code===codes[6]))this.events.push({seatId:seat.id,group:group({pass:code===codes[5],switchPlayer:code===codes[6]})});
  }
 }
 keyDown(code:string,repeat=false):void{
  if(!repeat&&this.blockedKeys.delete(code))this.keys.delete(code);
  if(!repeat&&!this.keys.has(code)&&!this.blockedKeys.has(code)){this.edges.add(code);this.observed(code,`key:${code}`,false,true);}
  this.keys.add(code);
 }
 keyUp(code:string):void{if(this.keys.has(code)&&!this.blockedKeys.has(code))this.observed(code,`key:${code}`,false,false);this.keys.delete(code);this.blockedKeys.delete(code);}
 pointerDown(id:number,code:string):void{if(!this.pointers.has(id)&&!this.blockedPointers.has(id))this.observed(code,`touch:${id}`,true,true);this.pointers.set(id,code);}
 pointerUp(id:number):void{const code=this.pointers.get(id);if(code&&!this.blockedPointers.has(id))this.observed(code,`touch:${id}`,true,false);this.pointers.delete(id);this.blockedPointers.delete(id);}
 private buttons(pad:Gamepad):Set<number>{return new Set(pad.buttons.flatMap((b,i)=>b.pressed||(Number.isFinite(b.value)&&b.value>.5)?[i]:[]));}
 poll():{inputs:Record<string,InputState>;actionGroups:Record<string,ActionGroup[]>;pausePressed:boolean;disconnected:string[];unsupported:string[]}{
  const inputs:Record<string,InputState>={},actionGroups:Record<string,ActionGroup[]>={},disconnected:string[]=[],unsupported:string[]=[];
  let pausePressed=this.edges.has('Escape');const pads=this.readPads();
  const hasKeyboard2=this.seats.some(s=>s.device==='keyboard2');
  const padValues=new Map<string,{moveX:number;moveY:number;sprint:boolean}>();
  for(const seat of this.seats){if(!seat.device.startsWith('gamepad:'))continue;
   const index=Number(seat.device.slice(8)),pad=pads[index];
   if(!pad||!pad.connected){this.charges.delete(seat.id);this.events=this.events.filter(e=>e.seatId!==seat.id);disconnected.push(seat.id);continue;}
   const buttons=this.buttons(pad),previous=this.padHeld.get(index)??new Set<number>(),blocked=this.blockedPadButtons.get(index);
   if(blocked)for(const button of blocked)if(!buttons.has(button))blocked.delete(button);
   this.padHeld.set(index,buttons);
   if(pad.mapping!=='standard'){this.charges.delete(seat.id);this.events=this.events.filter(e=>e.seatId!==seat.id);unsupported.push(seat.id);continue;}
   const pulse=(button:number)=>buttons.has(button)&&!previous.has(button)&&!blocked?.has(button);
   if(pulse(1))this.begin(seat.id,`pad:${index}`);
   if(!buttons.has(1)&&previous.has(1))this.end(seat.id,`pad:${index}`);
   const pass=pulse(0),switchPlayer=pulse(4);if(pass||switchPlayer)this.events.push({seatId:seat.id,group:group({pass,switchPlayer})});pausePressed ||=pulse(9);
   const axis=(v:number)=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
   const x=axis(pad.axes[0]),y=axis(pad.axes[1]),length=Math.hypot(x,y),scale=length>.18?Math.min(1,(length-.18)/.82)/length:0;
   padValues.set(seat.id,{moveX:x*scale,moveY:y*scale,sprint:buttons.has(7)&&!blocked?.has(7)});
  }
  for(const[index,seat]of this.seats.entries()){
   const input:InputState={...EMPTY_INPUT};inputs[seat.id]=input;
   const groups=this.events.filter(e=>e.seatId===seat.id).map(e=>({...e.group}));actionGroups[seat.id]=groups;
   if(disconnected.includes(seat.id)||unsupported.includes(seat.id))continue;
   const held=(code:string)=>this.keys.has(code)&&!this.blockedKeys.has(code);
   if(seat.device==='keyboard1'||seat.device==='keyboard2'){
    const codes=layouts[seat.device],alias=(i:number)=>seat.device==='keyboard1'&&!hasKeyboard2&&(i<4||i===7)&&held(layouts.keyboard2[i]);
    input.moveX=Number(held(codes[1])||alias(1))-Number(held(codes[0])||alias(0));
    input.moveY=Number(held(codes[3])||alias(3))-Number(held(codes[2])||alias(2));input.sprint=held(codes[7])||Boolean(alias(7));
   }else Object.assign(input,padValues.get(seat.id));
   if(index===0){const touch=new Set([...this.pointers].filter(([id])=>!this.blockedPointers.has(id)).map(([,code])=>code));
    input.moveX+=Number(touch.has('KeyD'))-Number(touch.has('KeyA'));input.moveY+=Number(touch.has('KeyS'))-Number(touch.has('KeyW'));input.sprint ||=touch.has('ShiftLeft');
   }
   input.shoot=groups.some(g=>g.shoot);input.pass=groups.some(g=>g.pass);input.switchPlayer=groups.some(g=>g.switchPlayer);
   if(groups.some(g=>g.chargeStart))input.chargeStart=true;
   const charge=this.charges.get(seat.id);
   if(charge){input.shootHeld=true;input.shotCharge=ratio(this.now()-charge.start,charge.duration);}
   else {const release=[...groups].reverse().find(g=>g.shoot&&g.shotCharge!==undefined);if(release){input.shootHeld=false;input.shotCharge=release.shotCharge;}}
   const length=Math.hypot(input.moveX,input.moveY);if(length>1){input.moveX/=length;input.moveY/=length;}
  }
  this.edges.clear();this.events=[];return {inputs,actionGroups,pausePressed,disconnected,unsupported};
 }
}
