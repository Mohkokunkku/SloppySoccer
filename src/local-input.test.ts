import { describe, expect, it } from 'vitest';
import { LocalInputHub } from './local-input';
import { LocalInputQueue } from './local-input-queue';
import type { LocalSeat } from '../shared/types';
const seats: LocalSeat[] = [{ id: 'p1', team: 'home', device: 'keyboard1' }, { id: 'p2', team: 'away', device: 'keyboard2' }];
const pad = () => ({ index: 0, connected: true, mapping: 'standard', axes: [0, 0], buttons: Array.from({ length: 10 }, () => ({ pressed: false, value: 0 })) });
describe('LocalInputHub', () => {
  it('orders mixed keyboard/touch events, ignores held repeats and discards clear/seat boundaries', () => {
    const hub = new LocalInputHub(() => []); hub.setSeats(seats);
    hub.keyDown('KeyE'); hub.keyDown('KeyE', true); hub.pointerDown(1, 'Space');
    hub.keyDown('Period'); hub.pointerUp(1); hub.pointerDown(1, 'KeyQ');
    expect(hub.poll().actionGroups).toEqual({
      p1: [{shoot:false,pass:true,switchPlayer:false},{shoot:true,pass:false,switchPlayer:false},{shoot:false,pass:false,switchPlayer:true}],
      p2: [{shoot:false,pass:false,switchPlayer:true}],
    });
    expect(hub.poll().actionGroups).toEqual({p1:[],p2:[]});
    hub.keyUp('KeyE'); hub.keyDown('KeyE'); hub.pointerDown(2,'Space'); hub.clear();
    expect(hub.poll().actionGroups).toEqual({p1:[],p2:[]});
    hub.keyUp('KeyE'); hub.keyDown('KeyE'); hub.setSeats([{id:'p3',team:'home',device:'keyboard2'}]);
    expect(hub.poll().actionGroups).toEqual({p3:[]});
  });
  it('includes one sampled standard pad group without duplicating it through summary booleans', () => {
    const device=pad(); const hub=new LocalInputHub(()=>[device] as unknown as Gamepad[]);
    hub.setSeats([{id:'p1',team:'home',device:'gamepad:0'}]);
    device.buttons[0].pressed=true; device.buttons[1].pressed=true;
    const result=hub.poll();
    expect(result.inputs.p1).toMatchObject({pass:true,shoot:true});
    expect(result.actionGroups.p1).toEqual([{pass:true,shoot:true,switchPlayer:false}]);
    const queue=new LocalInputQueue(); queue.push(result.inputs,result.actionGroups);
    expect(queue.consume().p1).toMatchObject({pass:true,shoot:true});
    expect(queue.consume().p1).toMatchObject({pass:false,shoot:false});
    expect(hub.poll().actionGroups.p1).toEqual([]);
  });
  it('isolates keyboards, normalizes diagonals and emits action pulses', () => {
    const hub = new LocalInputHub(() => []); hub.setSeats(seats);
    for (const key of ['KeyW', 'KeyD', 'ArrowLeft', 'Enter', 'Space', 'ShiftRight']) hub.keyDown(key);
    const first = hub.poll().inputs;
    expect(Math.hypot(first.p1.moveX, first.p1.moveY)).toBeCloseTo(1);
    expect(first.p1.shoot).toBe(true); expect(first.p1.sprint).toBe(false);
    expect(first.p2).toMatchObject({ moveX: -1, shoot: true, sprint: true });
    expect(hub.poll().inputs.p1.shoot).toBe(false);
  });
  it('retains legacy aliases only without keyboard2 and routes touch only to first seat', () => {
    const hub = new LocalInputHub(() => []); hub.keyDown('ArrowRight'); hub.keyDown('ShiftRight');
    expect(hub.poll().inputs.p1).toMatchObject({ moveX: 1, sprint: true });
    hub.setSeats(seats); hub.pointerDown(1, 'Space');
    expect(hub.poll().inputs.p1.shoot).toBe(true); expect(hub.poll().inputs.p2.shoot).toBe(false);
  });
  it('maps standard pad edges, radial deadzone, finite axes and disconnects honestly', () => {
    let devices: (ReturnType<typeof pad> | null)[] = [pad()]; const hub = new LocalInputHub(() => devices as unknown as Gamepad[]);
    hub.setSeats([{ id: 'p1', team: 'home', device: 'gamepad:0' }]);
    devices[0]!.axes[0] = 0.1; devices[0]!.buttons[0].pressed = true; devices[0]!.buttons[9].pressed = true;
    expect(hub.poll()).toMatchObject({ inputs: { p1: { moveX: 0, pass: true } }, pausePressed: true });
    expect(hub.poll()).toMatchObject({ inputs: { p1: { pass: false } }, pausePressed: false });
    devices[0]!.axes[0] = Infinity; devices[0]!.axes[1] = -2;
    expect(hub.poll().inputs.p1.moveY).toBe(-1);
    devices = []; expect(hub.poll()).toMatchObject({ disconnected: ['p1'], inputs: { p1: { pass: false, moveX: 0 } } });
  });
  it('clear suppresses held keyboard, touch and controller actions until release', () => {
    const device = pad(); const hub = new LocalInputHub(() => [device] as unknown as Gamepad[]); hub.setSeats([...seats.slice(0, 1), { id: 'p2', team: 'away', device: 'gamepad:0' }]);
    hub.keyDown('Space'); hub.pointerDown(1, 'KeyE'); device.buttons[0].pressed = true; device.buttons[9].pressed = true;
    device.buttons[7].pressed = true;
    hub.clear(); hub.keyDown('Space', true); hub.pointerDown(1, 'KeyE');
    expect(hub.poll()).toMatchObject({ pausePressed: false, inputs: { p1: { shoot: false, pass: false }, p2: { pass: false, sprint: false } } });
    hub.keyUp('Space'); hub.keyDown('Space'); device.buttons[0].pressed = false; hub.poll(); device.buttons[0].pressed = true;
    expect(hub.poll().inputs.p2.pass).toBe(true);
  });
  it('recovers a fresh press after blur loses keyup, without a sacrificial release', () => {
    const hub = new LocalInputHub(() => []);
    hub.keyDown('KeyD', false); hub.keyDown('Space', false);
    hub.clear(); // Released outside the window: no keyUp is delivered.
    hub.keyDown('KeyD', false); hub.keyDown('Space', false);
    expect(hub.poll().inputs.p1).toMatchObject({ moveX: 1, shoot: true });
    expect(hub.poll().inputs.p1.shoot).toBe(false);
  });
  it('suppresses held repeats after clear until release and preserves pending pulses', () => {
    const hub = new LocalInputHub(() => []);
    hub.keyDown('KeyD', false); hub.keyDown('Space', false); hub.clear();
    hub.keyDown('KeyD', true); hub.keyDown('Space', true);
    expect(hub.poll().inputs.p1).toMatchObject({ moveX: 0, shoot: false });
    hub.keyUp('KeyD'); hub.keyUp('Space');
    hub.keyDown('KeyD', false); hub.keyDown('Space', false);
    hub.keyDown('Space', true); hub.keyUp('Space');
    expect(hub.poll().inputs.p1).toMatchObject({ moveX: 1, shoot: true });
    expect(hub.poll().inputs.p1.shoot).toBe(false);
    hub.keyDown('Space', false); hub.clear();
    expect(hub.poll().inputs.p1.shoot).toBe(false);
  });
  it('reports standard -> disconnected -> unsupported -> standard reconnects honestly', () => {
    const device = pad();
    let devices: (ReturnType<typeof pad> | null)[] = [device];
    const hub = new LocalInputHub(() => devices as unknown as Gamepad[]);
    hub.setSeats([{ id: 'p1', team: 'home', device: 'gamepad:0' }]);
    device.axes[0] = 1;
    expect(hub.poll()).toMatchObject({ disconnected: [], unsupported: [], inputs: { p1: { moveX: 1 } } });
    devices = [null];
    expect(hub.poll()).toMatchObject({ disconnected: ['p1'], unsupported: [], inputs: { p1: { moveX: 0 } } });
    device.mapping = ''; devices = [device]; device.buttons[0].pressed = true;
    expect(hub.poll()).toMatchObject({ disconnected: [], unsupported: ['p1'], inputs: { p1: { moveX: 0, pass: false } } });
    device.mapping = 'standard'; device.buttons[0].pressed = false;
    expect(hub.poll()).toMatchObject({ disconnected: [], unsupported: [], inputs: { p1: { moveX: 1, pass: false } } });
    device.buttons[0].pressed = true;
    expect(hub.poll().inputs.p1.pass).toBe(true);
  });
  it('does not guess nonstandard pad mappings', () => {
    const device = pad(); Object.assign(device, { mapping: '' }); device.buttons[0].pressed = true;
    const hub = new LocalInputHub(() => [device] as unknown as Gamepad[]); hub.setSeats([{ id: 'p1', team: 'home', device: 'gamepad:0' }]);
    expect(hub.poll().inputs.p1.pass).toBe(false);
  });
  it('combines touch and keyboard movement without double counting touch', () => {
    const hub = new LocalInputHub(() => []);
    hub.keyDown('KeyW'); hub.pointerDown(1, 'KeyD');
    const input = hub.poll().inputs.p1;
    expect(input.moveX).toBeCloseTo(-input.moveY);
  });
});
