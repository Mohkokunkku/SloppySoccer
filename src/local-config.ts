import type {LocalSeat, MatchConfig} from '../shared/types';
import {sanitizeFormations} from '../shared/formations';
import {sanitizeConfig} from './model';

export interface SetupRadio {name:string;value:string;checked:boolean;disabled:boolean}

export function selectedLocalConfig(radios:Iterable<SetupRadio>, formations:unknown):MatchConfig {
  // Locked controls retain their choices; successful-control serialization does not.
  const values=Object.fromEntries([...radios].filter(field=>field.checked).map(field=>[field.name,field.value]));
  return {...sanitizeConfig(values),formations:sanitizeFormations(formations)};
}

export function localControlGuide(seats:readonly LocalSeat[]):string {
  const secondKeyboard=seats.some(seat=>seat.device==='keyboard2');
  return seats.map(seat=>{
    const owner=`${seat.id.toUpperCase()} ${seat.team==='home'?'Spain →':'Argentina ←'}`;
    const controls=seat.device==='keyboard1'
      ? `${secondKeyboard?'WASD':'WASD or arrows'} move, Space shoot, E pass, Q switch, Left Shift${secondKeyboard?'':' or Right Shift'} sprint`
      : seat.device==='keyboard2'
        ? 'arrows move, Enter shoot, / pass, . switch, Right Shift sprint'
        : `Controller ${Number(seat.device.slice(8))+1} (standard mapping): left stick move, Cross pass, Circle shoot, L1 switch, R2 sprint, Options pause`;
    return `${owner}: ${controls}`;
  }).concat('Esc pause').join(' · ');
}
