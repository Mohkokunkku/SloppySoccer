import type{InputState}from'../shared/types';
export type ActionGroup=Pick<InputState,'shoot'|'pass'|'switchPlayer'|'chargeStart'|'shotCharge'>;
/** Consume one chronological poll action group per seat, with latest held movement. */
export class LocalInputQueue{
 private held=new Map<string,InputState>();
 private pending=new Map<string,ActionGroup[]>();
 push(inputs:Record<string,InputState>,actionGroups?:Record<string,ActionGroup[]>):void{for(const[id,value]of Object.entries(inputs)){
  const held={...value,shoot:false,pass:false,switchPlayer:false};delete held.chargeStart;this.held.set(id,held);
  const incoming=actionGroups===undefined?(value.shoot||value.pass||value.switchPlayer||value.chargeStart?[value]:[]):actionGroups[id]??[];
  if(incoming.length){const groups=this.pending.get(id)??[];for(const value of incoming){const action:ActionGroup={shoot:value.shoot,pass:value.pass,switchPlayer:value.switchPlayer};if(value.chargeStart!==undefined)action.chargeStart=value.chargeStart;if(value.shotCharge!==undefined)action.shotCharge=value.shotCharge;groups.push(action);}this.pending.set(id,groups);}
 }}
 consume():Record<string,InputState>{return Object.fromEntries(Array.from(this.held,([id,input])=>{
  const groups=this.pending.get(id),group=groups?.shift();
  if(groups?.length===0)this.pending.delete(id);
  return [id,{...input,...group}];
 }));}
 clear():void{this.held.clear();this.pending.clear();}
}
