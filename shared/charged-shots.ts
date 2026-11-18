export function chargedShotPower(kickPower:number,charge:number):number {
  const value=Number.isFinite(charge)?Math.max(0,Math.min(1,charge)):0;
  return kickPower*(0.4+0.8*value);
}

export function chargedShotAngle(base:number, releaseId:number, playerId:string, charge:number):number {
  let hash=(releaseId|0)^0x6d2b79f5;
  for(let i=0;i<playerId.length;i++){hash=Math.imul(hash^playerId.charCodeAt(i),16777619);}
  hash^=hash>>>15;hash=Math.imul(hash,2246822519);hash^=hash>>>13;
  const unit=(hash>>>0)/0xffffffff;
  const magnitude=(Number.isFinite(charge)?Math.max(0,Math.min(1,charge)):0)*0.08;
  return base+(unit*2-1)*magnitude;
}