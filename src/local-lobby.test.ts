import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountLocalLobby } from './local-lobby';

// Minimal DOM unit double: browser rendering and event propagation remain integration checks.
class ElementDouble {
  tagName: string; id = ''; textContent = ''; value = ''; checked = false; disabled = false; type = ''; className = '';
  parent:ElementDouble|null=null;hidden=false;
  children: ElementDouble[] = []; listeners = new Map<string, ((event:any) => void)[]>();
  constructor(tag: string) { this.tagName = tag; }
  append(...items: ElementDouble[]) { for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(child=>child!==item);this.children.push(item);item.parent=this;} }
  replaceChildren(...items: ElementDouble[]) { this.children = items; }
  addEventListener(name: string, fn: (event:any) => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], fn]); }
  setAttribute() {}
  fire(name: string,event:any={preventDefault(){},stopPropagation(){}}) { for (const fn of this.listeners.get(name) ?? []) fn(event); }
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
  it('renders tokens inside team zones with device hints and moves once per click', () => {
    const { host, get, change } = setup();
    const zones = host.find('local-lobby')!.children.find(child => child.className === 'team-drop-zones')!;
    const token=get('seat-p1-token');expect(zones.children[0].children).toContain(token);expect(token.textContent).toContain('P1');expect(token.textContent).toContain('⌨');
    get('seat-p1-enabled').checked = true;
    token.fire('click');
    expect(get('seat-p1-team').value).toBe('away');
    expect(zones.children[1].children).toContain(token);expect(zones.children[0].children).not.toContain(token);
    expect(change).toHaveBeenCalledTimes(1);
  });
  it('accepts drag/drop once and rejects locked or disabled seat drops',()=>{
    const {lobby,get,change}=setup(),away=get('team-away-zone'),home=get('team-home-zone');
    const event={preventDefault(){},dataTransfer:{getData:()=> '1'}};away.fire('drop',event);expect(get('seat-p1-team').value).toBe('away');expect(change).toHaveBeenCalledTimes(1);
    lobby.setLocked(true);home.fire('drop',event);get('seat-p1-token').fire('click');expect(get('seat-p1-team').value).toBe('away');expect(change).toHaveBeenCalledTimes(1);
    lobby.setLocked(false);home.fire('drop',{...event,dataTransfer:{getData:()=> '2'}});expect(change).toHaveBeenCalledTimes(1);
  });
});
