import {it,expect} from 'vitest';
import {roleMarker} from './role-marker';
it.each([['attacker','A'],['midfielder','M'],['defender','D'],['keeper','GK'],[undefined,'?']] as const)('labels %s as %s',(role,label)=>expect(roleMarker(role)).toBe(label));
