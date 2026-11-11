import type {GameState} from '../shared/types';
import {humanControls} from '../shared/local-controls';
import './kick-meters.css';

export function kickMeterRows(state:GameState):{seatId:string;value:number;charging:boolean}[] {
  return humanControls(state).map(control=>{
    const entry=state.shotCharges?.[control.seatId];
    const charging=state.phase==='playing'&&state.ball.ownerId===control.playerId&&entry?.playerId===control.playerId;
    const value=charging&&Number.isFinite(entry?.value)?Math.max(0,Math.min(1,entry!.value)):0;
    return {seatId:control.seatId,value,charging};
  });
}
export class KickMeters {
  private nodes=new Map<string,{row:HTMLElement;track:HTMLElement;value:HTMLElement}>();
  private signature='';
  constructor(private host:HTMLElement){}
  update(state:GameState):void {
    this.host.hidden=state.phase!=='playing';
    const rows=kickMeterRows(state),signature=rows.map(row=>row.seatId).join(',');
    if(signature!==this.signature){
      this.signature=signature;this.host.replaceChildren();this.nodes.clear();
      rows.forEach((item,index)=>{
        const row=document.createElement('div');row.className='kick-meter';
        row.setAttribute('data-seat',item.seatId);row.style.setProperty('--seat-color',['#ffe183','#7ce9ff','#ff91d5','#aaff8c'][index%4]);
        const label=document.createElement('span');label.textContent=`${item.seatId.toUpperCase()} kick`;
        const track=document.createElement('div');track.className='kick-track';track.setAttribute('role','progressbar');
        track.setAttribute('aria-label',`${item.seatId.toUpperCase()} kick charge`);track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
        const fill=document.createElement('span');fill.className='kick-fill';track.append(fill);
        const value=document.createElement('span');value.className='kick-value';
        row.append(label,track,value);this.host.append(row);this.nodes.set(item.seatId,{row,track,value});
      });
    }
    for(const item of rows){const node=this.nodes.get(item.seatId)!;const percent=Math.round(item.value*100);
      node.track.setAttribute('aria-valuenow',String(percent));node.track.setAttribute('data-charge',String(item.value));
      node.row.setAttribute('data-charging',String(item.charging));node.track.style.setProperty('--charge',`${percent}%`);
      node.value.textContent=item.charging?`${percent}% · release to kick`:'Hold shot, release to kick';
    }
  }
}
