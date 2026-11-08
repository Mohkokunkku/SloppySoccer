import type{GameState,LocalSeat,HumanControl,InputDevice}from'./types.js';
const defaultSeat=():LocalSeat=>({id:'p1',team:'home',device:'keyboard1'});
export function normalizeSeats(value:unknown):LocalSeat[]{
 if(!Array.isArray(value))return[defaultSeat()];const seats:LocalSeat[]=[],ids=new Set<string>(),devices=new Set<string>();
 for(const row of value){if(!row||typeof row!=='object')continue;const{id,team,device}=row as Record<string,unknown>;
  if(typeof id!=='string'||!/^p[1-4]$/.test(id)||ids.has(id)||(team!=='home'&&team!=='away')||typeof device!=='string'||devices.has(device))continue;
  if(device!=='keyboard1'&&device!=='keyboard2'&&!( /^gamepad:(0|[1-9]\d?)$/.test(device)&&Number(device.slice(8))<=15))continue;
  seats.push({id,team,device:device as InputDevice});ids.add(id);devices.add(device);if(seats.length===4)break;
 }return seats.length?seats:[defaultSeat()];
}
export function humanControls(state:GameState):HumanControl[]{
 const candidates=state.controls??[{seatId:'p1',team:state.players.find(p=>p.id===state.controlledId)?.team??'home',playerId:state.controlledId}];
 const players=new Set<string>(),seats=new Set<string>();return candidates.filter(c=>{const p=state.players.find(p=>p.id===c.playerId);if(!p||p.role!=='outfield'||p.team!==c.team||players.has(c.playerId)||seats.has(c.seatId))return false;players.add(c.playerId);seats.add(c.seatId);return true;});
}
export function controlledPlayerIds(state:GameState):Set<string>{return new Set(humanControls(state).map(c=>c.playerId));}
export function assignLocalControls(state:GameState,seats:LocalSeat[]):void{
 const used=new Set<string>(),controls:HumanControl[]=[];
 for(const seat of normalizeSeats(seats)){const player=state.players.filter(p=>p.team===seat.team&&p.role==='outfield'&&!used.has(p.id)).sort((a,b)=>a.id.localeCompare(b.id))[0];if(player){used.add(player.id);controls.push({seatId:seat.id,team:seat.team,playerId:player.id});}}
 state.controls=controls;if(controls[0])state.controlledId=controls[0].playerId;
}
