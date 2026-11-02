import {it,expect} from 'vitest';
import {roleHint} from './role-hint';
it.each([
  ['attacker','Find space ahead for a pass.'],
  ['midfielder','Support the carrier and block passing lanes.'],
  ['defender','Stay goal-side and protect the space behind.'],
  [undefined,'Keep your shape and support the team.'],
] as const)('gives the exact tested hint for %s', (role,text)=>{
  expect(roleHint(role)).toBe(text); expect(roleHint(role)).toBe(text);
});
