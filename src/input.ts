import type { InputState } from '../shared/types';

export class InputController {
  private keys = new Set<string>();
  private pressed = new Set<string>();
  private pointers = new Map<number, string>();
  pointerDown(id: number, code: string): void {
    if (!this.pointers.has(id)) this.pressed.add(code);
    this.pointers.set(id, code);
  }
  pointerUp(id: number): void { this.pointers.delete(id); }
  clear(): void { this.keys.clear(); this.pressed.clear(); this.pointers.clear(); }
  keyDown(code: string): void {
    if (!this.keys.has(code)) this.pressed.add(code);
    this.keys.add(code);
  }
  keyUp(code: string): void { this.keys.delete(code); }
  consume(): InputState {
    const held = new Set([...this.keys, ...this.pointers.values()]);
    const has = (...codes: string[]) => codes.some(code => held.has(code));
    let x = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft'));
    let y = Number(has('KeyS', 'ArrowDown')) - Number(has('KeyW', 'ArrowUp'));
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const state = { moveX: x, moveY: y, shoot: this.pressed.has('Space'), pass: this.pressed.has('KeyE'), sprint: has('ShiftLeft', 'ShiftRight'), switchPlayer: this.pressed.has('KeyQ') };
    this.pressed.clear();
    return state;
  }
}
