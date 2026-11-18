import {expect,it} from 'vitest';
import {createGame} from '../shared/engine';
import {roleChargeView} from './role-charge';
it('fills the controlled positional badge with the authorized shot percentage and changing color',()=>{
 const s=createGame();s.phase='playing';s.ball.ownerId='home-0';s.shotCharges={p1:{playerId:'home-0',value:.25}};
 const low=roleChargeView(s,'home-0');expect(low).toMatchObject({charging:true,percent:25});expect(low.background).toContain('25%');
 s.shotCharges.p1.value=.9;const high=roleChargeView(s,'home-0');expect(high.percent).toBe(90);expect(high.color).not.toBe(low.color);
 expect(roleChargeView(s,'away-0').charging).toBe(false);
});
it('clears the badge after loss, control changes or pause cancellation and clamps invalid charge',()=>{
 const s=createGame();s.phase='playing';s.ball.ownerId='home-0';s.shotCharges={p1:{playerId:'home-0',value:3}};
 expect(roleChargeView(s,'home-0').percent).toBe(100);s.shotCharges.p1.value=NaN;expect(roleChargeView(s,'home-0').percent).toBe(0);
 s.ball.ownerId='away-0';expect(roleChargeView(s,'home-0').background).toBe('');s.phase='finished';expect(roleChargeView(s,'home-0').charging).toBe(false);
});
