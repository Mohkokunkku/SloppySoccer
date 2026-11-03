import {it,expect} from 'vitest';
import {TEAMS} from './teams';
it('presents the stable home/away teams as Spain and Argentina',()=>{
 expect(TEAMS.home.name).toBe('Spain');expect(TEAMS.away.name).toBe('Argentina');
 expect(TEAMS.home.code).toBe('ESP');expect(TEAMS.away.code).toBe('ARG');
 expect(TEAMS.home.flag).toHaveLength(3);expect(TEAMS.away.flag[1]).toBe('#fffdf5');
});
