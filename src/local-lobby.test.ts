import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountLocalLobby } from './local-lobby';

// Minimal DOM unit double: browser rendering and event propagation remain integration checks.
class ElementDouble {
  tagName: string; id = ''; textContent = ''; value = ''; checked = false; disabled = false; type = ''; className = '';
  children: ElementDouble[] = []; listeners = new Map<string, (() => void)[]>();
  constructor(tag: string) { this.tagName = tag; }
  append(...items: ElementDouble[]) { this.children.push(...items); }
  replaceChildren(...items: ElementDouble[]) { this.children = items; }
  addEventListener(name: string, fn: () => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]); }
  setAttribute() {}
  fire(name: string) { for (const fn of this.listeners.get(name) ?? []) fn(); }
  find(id: string): ElementDouble | undefined { return this.id === id ? this : this.children.map(child => child.find(id)).find(Boolean); }
}
function setup(pads: { index: number; connected: boolean; mapping: string }[] = []) {
  vi.stubGlobal('document', { createElement: (tag: string) => new ElementDouble(tag) });
  vi.stubGlobal('navigator', { getGamepads: () => pads });
  const host = new ElementDouble('div'); const change = vi.fn();
  const lobby = mountLocalLobby(host as unknown as HTMLElement, change);
  return { host, lobby, change, get: (id: string) => host.find(id)! };
}
afterEach(() => vi.unstubAllGlobals());
describe('local lobby', () => {
  it('creates four stable rows with only p1 enabled and visible instructions', () => {
    const { host, lobby, get } = setup();
    expect(lobby.readSeats()).toEqual([{ id: 'p1', team: 'home', device: 'keyboard1' }]);
    for (const n of [1, 2, 3, 4]) expect(get(`seat-p${n}-enabled`).checked).toBe(n === 1);
    expect(get('seat-p2-team').value).toBe('away');
    expect(get('seat-p3-device').value).toBe('gamepad:0');
    expect(host.find('local-lobby')).toBeDefined();
    expect(get('local-lobby-help').textContent).toContain('USB/Bluetooth');
  });
  it('normalizes duplicates, reports them and locks all seat fields', () => {
    const { lobby, get, change } = setup();
    get('seat-p2-enabled').checked = true; get('seat-p2-device').value = 'keyboard1'; get('seat-p2-device').fire('change');
    expect(lobby.readSeats()).toHaveLength(1); expect(get('seat-p2-status').textContent).toContain('already assigned'); expect(change).toHaveBeenCalled();
    lobby.setLocked(true);
    expect(get('local-lobby').disabled).toBe(true);
    expect(get('seat-p1-device').disabled).toBe(true);
    lobby.setLocked(false); expect(get('seat-p1-device').disabled).toBe(false);
  });
  it('lists detected devices only plus selected disconnected placeholders and unmapped warnings', () => {
    const pads = [{ index: 2, connected: true, mapping: '' }]; const { lobby, get } = setup(pads);
    const device = get('seat-p1-device');
    expect(device.children.map(option => option.value)).toContain('gamepad:2');
    expect(device.children.map(option => option.value)).not.toContain('gamepad:3');
    device.value = 'gamepad:2'; device.fire('change');
    expect(get('seat-p1-status').textContent).toContain('unmapped');
    pads.length = 0; lobby.refreshDevices();
    expect(device.value).toBe('gamepad:2'); expect(get('seat-p1-status').textContent).toContain('disconnected');
  });
});
