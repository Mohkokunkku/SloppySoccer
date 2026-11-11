import type { LocalSeat } from '../shared/types';
import './controls-guide.css';

const signatures=new WeakMap<HTMLElement,string>();
export function renderControlGuide(host: HTMLElement, seats: LocalSeat[]): void {
  const next = seats.map(seat => `${seat.id}:${seat.device}`).join('|');
  if (next === signatures.get(host) && host.childElementCount) return;
  signatures.set(host,next);
  host.replaceChildren();
  const unique = [{device:'keyboard1',id:seats.filter(s=>s.device==='keyboard1').map(s=>s.id).join(', ')},{device:'keyboard2',id:seats.filter(s=>s.device==='keyboard2').map(s=>s.id).join(', ')},{device:'gamepad',id:seats.filter(s=>s.device.startsWith('gamepad:')).map(s=>s.id).join(', ')}];
  for (const seat of unique) {
    const keyboard = seat.device === 'keyboard1' ? 'keyboard-1.svg' : seat.device === 'keyboard2' ? 'keyboard-2.svg' : 'gamepad.svg';
    const card = document.createElement('section'); card.className = 'control-guide-card';
    const image = document.createElement('img'); image.src = `/controls/${keyboard}`; image.alt = keyboard === 'gamepad.svg' ? 'Controller: left stick move, Cross pass, Circle hold and release shoot, L1 switch, R2 sprint, Options pause' : keyboard === 'keyboard-1.svg' ? 'Keyboard 1: WASD move, Space hold and release shoot, E pass, Q switch, Shift sprint' : 'Keyboard 2: arrows move, Enter hold and release shoot, slash pass, period switch, Shift sprint';
    const text = document.createElement('p'); text.textContent = `${seat.id?seat.id.toUpperCase()+' · ':''}${seat.device==='keyboard1'?'WASD move · Space shot · E pass · Q switch · Left Shift sprint':seat.device==='keyboard2'?'Arrows move · Enter shot · / pass · . switch · Right Shift sprint':'Left stick move · Circle/B shot · Cross/A pass · L1/LB switch · R2/RT sprint'}. Hold shot, release to kick.`;
    card.append(image, text); host.append(card);
  }
}
