import { describe, expect, it } from 'vitest';
import { InputController } from './input';

describe('input mapping', () => {
  it('maps displayed right to +x and up to -y without diagonal speed gain', () => {
    const input = new InputController();
    input.keyDown('KeyD'); input.keyDown('ArrowUp');
    const state = input.consume();
    expect(state.moveX).toBeCloseTo(Math.SQRT1_2);
    expect(state.moveY).toBeCloseTo(-Math.SQRT1_2);
    input.keyUp('KeyD');
    expect(input.consume().moveX).toBe(0);
  });
  it('tracks touch directions and actions independently by pointer id, and clears on blur', () => {
    const input = new InputController();
    input.pointerDown(11, 'ArrowRight'); input.pointerDown(12, 'Space'); input.pointerDown(13, 'ShiftLeft');
    expect(input.consume()).toMatchObject({ moveX: 1, shoot: true, sprint: true });
    input.pointerUp(12);
    expect(input.consume()).toMatchObject({ moveX: 1, shoot: false, sprint: true });
    input.pointerDown(14, 'ArrowRight'); input.pointerUp(11);
    expect(input.consume().moveX).toBe(1);
    input.clear();
    expect(input.consume()).toEqual({ moveX: 0, moveY: 0, shoot: false, pass: false, sprint: false, switchPlayer: false });
  });
  it('consumes each shoot/pass/switch press once, not on keyboard repeats', () => {
    const input = new InputController();
    input.keyDown('Space'); input.keyDown('KeyE'); input.keyDown('KeyQ'); input.keyDown('ShiftLeft');
    expect(input.consume()).toMatchObject({ shoot: true, pass: true, switchPlayer: true, sprint: true });
    input.keyDown('Space');
    expect(input.consume()).toMatchObject({ shoot: false, pass: false, switchPlayer: false, sprint: true });
    input.keyUp('Space'); input.keyDown('Space');
    expect(input.consume().shoot).toBe(true);
  });
});
