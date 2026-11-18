import { describe, expect, it } from 'vitest';
import { LocalInputHub } from './local-input';

describe('charged input', () => {
  it('emits charge start on shoot down and a ratio release on key up', () => {
    let now = 100;
    const hub = new LocalInputHub(() => [], () => now, () => 1.2);
    hub.setSeats([{ id: 'p1', team: 'home', device: 'keyboard1' }]);
    hub.keyDown('Space');
    expect(hub.poll().actionGroups.p1).toEqual([{ shoot: false, pass: false, switchPlayer: false, chargeStart: true }]);
    now += 600;
    expect(hub.poll().inputs.p1).toMatchObject({ shootHeld: true, shotCharge: 0.5 });
    hub.keyUp('Space');
    expect(hub.poll().actionGroups.p1).toEqual([{ shoot: true, pass: false, switchPlayer: false, shotCharge: 0.5 }]);
  });
});
