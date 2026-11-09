import type{InputState}from'../shared/types';
export type ActionGroup=Pick<InputState,'shoot'|'pass'|'switchPlayer'>;
/** Consume one chronological poll action group per seat, with latest held movement. */
export class LocalInputQueue{
 private held=new Map<string,InputState>();
 private pending=new Map<string,ActionGroup[]>();
 push(inputs:Record<string,InputState>,actionGroups?:Record<string,ActionGroup[]>):void{for(const[id,value]of Object.entries(inputs)){
  this.held.set(id,{...value,shoot:false,pass:false,switchPlayer:false});
  const incoming=actionGroups===undefined?(value.shoot||value.pass||value.switchPlayer?[value]:[]):actionGroups[id]??[];
  if(incoming.length){const groups=this.pending.get(id)??[];for(const group of incoming)groups.push({shoot:group.shoot,pass:group.pass,switchPlayer:group.switchPlayer});this.pending.set(id,groups);}
 }}
 consume():Record<string,InputState>{return Object.fromEntries(Array.from(this.held,([id,input])=>{
  const groups=this.pending.get(id),group=groups?.shift();
  if(groups?.length===0)this.pending.delete(id);
  return [id,{...input,...group}];
 }));}
 clear():void{this.held.clear();this.pending.clear();}
}
