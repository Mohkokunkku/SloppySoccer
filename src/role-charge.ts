import type {GameState} from '../shared/types';
import {humanControls} from '../shared/local-controls';
/** Only the human-controlled current ball owner may turn a role badge into a meter. */
export function roleChargeView(state:GameState,playerId:string):{charging:boolean;percent:number;color:string;background:string}{
 const seat=humanControls(state).find(c=>c.playerId===playerId);
 const charge=seat?state.shotCharges?.[seat.seatId]:undefined;
 const charging=state.phase==='playing'&&state.ball.ownerId===playerId&&charge?.playerId===playerId;
 const percent=charging&&Number.isFinite(charge?.value)?Math.round(Math.max(0,Math.min(1,charge!.value))*100):0;
 const color=percent<50?'#68e0a3':percent<85?'#ffd35a':'#ff786f';
 return {charging,percent,color,background:charging?`linear-gradient(to top, ${color} ${percent}%, #f9f4e8 ${percent}%)`:''};
}
