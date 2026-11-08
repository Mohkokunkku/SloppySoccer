import type { InputState, LocalSeat } from '../shared/types';
import { EMPTY_INPUT } from '../shared/types';
import { normalizeSeats } from '../shared/local-controls';
import type { ActionGroup } from './local-input-queue';

type PadReader = () => readonly (Gamepad | null)[];
const layouts = {
  keyboard1: ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space', 'KeyE', 'KeyQ', 'ShiftLeft'],
  keyboard2: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Slash', 'Period', 'ShiftRight'],
};
export class LocalInputHub {
  private seats = normalizeSeats(undefined);
  private keys = new Set<string>();
  private edges = new Set<string>();
  private pointers = new Map<number, string>();
  private pointerEdges = new Set<string>();
  private actionEvents: { source: 'keyboard' | 'touch'; code: string }[] = [];
  private blockedKeys = new Set<string>();
  private blockedPointers = new Set<number>();
  private padHeld = new Map<number, Set<number>>();
  private blockedPadButtons = new Map<number, Set<number>>();
  constructor(private readonly readPads: PadReader = () => typeof navigator === 'undefined' || !navigator.getGamepads ? [] : navigator.getGamepads()) {}
  setSeats(seats: LocalSeat[]): void { this.clear(); this.seats = normalizeSeats(seats); }
  clear(): void {
    this.actionEvents = [];
    for (const key of this.keys) this.blockedKeys.add(key);
    for (const id of this.pointers.keys()) this.blockedPointers.add(id);
    this.edges.clear(); this.pointerEdges.clear();
    for (const pad of this.readPads()) if (pad) {
      const buttons = this.buttons(pad);
      this.padHeld.set(pad.index, buttons); this.blockedPadButtons.set(pad.index, new Set(buttons));
    }
  }
  keyDown(code: string, repeat = false): void {
    // A real press proves an intervening release, even if blur lost its keyup.
    if (!repeat && this.blockedKeys.delete(code)) this.keys.delete(code);
    if (!repeat && !this.keys.has(code) && !this.blockedKeys.has(code)) {
      this.edges.add(code); this.actionEvents.push({ source: 'keyboard', code });
    }
    this.keys.add(code);
  }
  keyUp(code: string): void { this.keys.delete(code); this.blockedKeys.delete(code); }
  pointerDown(id: number, code: string): void {
    if (!this.pointers.has(id) && !this.blockedPointers.has(id)) {
      this.pointerEdges.add(code); this.actionEvents.push({ source: 'touch', code });
    }
    this.pointers.set(id, code);
  }
  pointerUp(id: number): void { this.pointers.delete(id); this.blockedPointers.delete(id); }
  private buttons(pad: Gamepad): Set<number> {
    return new Set(pad.buttons.flatMap((button, index) => button.pressed || (Number.isFinite(button.value) && button.value > 0.5) ? [index] : []));
  }
  poll(): { inputs: Record<string, InputState>; actionGroups: Record<string, ActionGroup[]>; pausePressed: boolean; disconnected: string[]; unsupported: string[] } {
    const inputs: Record<string, InputState> = {}; const disconnected: string[] = []; const unsupported: string[] = [];
    const actionGroups: Record<string, ActionGroup[]> = {};
    let pausePressed = this.edges.has('Escape');
    const pads = this.readPads();
    const hasKeyboard2 = this.seats.some(seat => seat.device === 'keyboard2');
    for (const [index, seat] of this.seats.entries()) {
      const input = { ...EMPTY_INPUT }; inputs[seat.id] = input;
      const groups: ActionGroup[] = []; actionGroups[seat.id] = groups;
      for (const event of this.actionEvents) {
        const codes = event.source === 'touch' ? (index === 0 ? layouts.keyboard1 : undefined)
          : seat.device === 'keyboard1' || seat.device === 'keyboard2' ? layouts[seat.device] : undefined;
        if (!codes) continue;
        const group = { shoot: event.code === codes[4], pass: event.code === codes[5], switchPlayer: event.code === codes[6] };
        if (group.shoot || group.pass || group.switchPlayer) groups.push(group);
      }
      const touchHeld = new Set(index === 0 ? [...this.pointers].filter(([id]) => !this.blockedPointers.has(id)).map(([, code]) => code) : []);
      const held = (code: string) => this.keys.has(code) && !this.blockedKeys.has(code);
      const edge = (code: string) => this.edges.has(code) || (index === 0 && this.pointerEdges.has(code));
      if (seat.device === 'keyboard1' || seat.device === 'keyboard2') {
        const codes = layouts[seat.device];
        const alias = (i: number) => seat.device === 'keyboard1' && !hasKeyboard2 && (i < 4 || i === 7) && held(layouts.keyboard2[i]);
        input.moveX = Number(held(codes[1]) || alias(1)) - Number(held(codes[0]) || alias(0));
        input.moveY = Number(held(codes[3]) || alias(3)) - Number(held(codes[2]) || alias(2));
        input.shoot = edge(codes[4]); input.pass = edge(codes[5]); input.switchPlayer = edge(codes[6]); input.sprint = held(codes[7]) || !!alias(7);
      } else {
        const padIndex = Number(seat.device.slice(8)); const pad = pads[padIndex];
        if (!pad || !pad.connected) { groups.length = 0; disconnected.push(seat.id); continue; }
        const buttons = this.buttons(pad); const previous = this.padHeld.get(padIndex) ?? new Set<number>();
        const blocked = this.blockedPadButtons.get(padIndex);
        if (blocked) for (const button of blocked) if (!buttons.has(button)) blocked.delete(button);
        this.padHeld.set(padIndex, buttons);
        if (pad.mapping !== 'standard') { groups.length = 0; unsupported.push(seat.id); continue; }
        const pulse = (button: number) => buttons.has(button) && !previous.has(button);
        const axis = (value: number) => Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
        const x = axis(pad.axes[0]); const y = axis(pad.axes[1]); const length = Math.hypot(x, y);
        if (length > 0.18) { const scale = Math.min(1, (length - 0.18) / 0.82) / length; input.moveX = x * scale; input.moveY = y * scale; }
        input.pass = pulse(0); input.shoot = pulse(1); input.switchPlayer = pulse(4); input.sprint = buttons.has(7) && !blocked?.has(7); pausePressed ||= pulse(9);
        if (input.pass || input.shoot || input.switchPlayer) groups.push({ pass: input.pass, shoot: input.shoot, switchPlayer: input.switchPlayer });
      }
      // Touch uses the legacy on-screen control codes even when the first seat is a pad or keyboard2.
      if (index === 0) {
        input.moveX += Number(touchHeld.has('KeyD')) - Number(touchHeld.has('KeyA'));
        input.moveY += Number(touchHeld.has('KeyS')) - Number(touchHeld.has('KeyW'));
        input.shoot ||= this.pointerEdges.has('Space'); input.pass ||= this.pointerEdges.has('KeyE');
        input.switchPlayer ||= this.pointerEdges.has('KeyQ'); input.sprint ||= touchHeld.has('ShiftLeft');
      }
      const length = Math.hypot(input.moveX, input.moveY);
      if (length > 1) { input.moveX /= length; input.moveY /= length; }
    }
    this.edges.clear(); this.pointerEdges.clear();
    this.actionEvents = [];
    return { inputs, actionGroups, pausePressed, disconnected, unsupported };
  }
}
