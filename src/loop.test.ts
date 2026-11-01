import { expect, it } from 'vitest';
import { FixedStepper } from './loop';
import { InputController } from './input';

it('runs fixed 1/60 steps, caps stalled frames and consumes discrete actions once', () => {
  const loop = new FixedStepper(); const input = new InputController();
  input.keyDown('Space');
  const values: boolean[] = []; const deltas: number[] = [];
  loop.advance(5, dt => { values.push(input.consume().shoot); deltas.push(dt); });
  expect(values.length).toBe(6);
  expect(values.filter(Boolean)).toHaveLength(1);
  expect(deltas.every(dt => dt === 1 / 60)).toBe(true);
  expect(loop.advance(0, () => {})).toBe(0);
});

it('drops stale partial time when paused or restarted', () => {
  const loop = new FixedStepper();
  loop.advance(0.01, () => {}); loop.reset();
  expect(loop.advance(0.01, () => {})).toBe(0);
});
