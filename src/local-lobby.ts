import type { LocalSeat } from '../shared/types';
import { normalizeSeats } from '../shared/local-controls';
import './local-lobby.css';

type Row = { enabled: HTMLInputElement; team: HTMLSelectElement; device: HTMLSelectElement; status: HTMLElement; token: HTMLButtonElement };
export function mountLocalLobby(host: HTMLElement, onChange?: (seats: LocalSeat[]) => void): {
  readSeats(): LocalSeat[]; refreshDevices(): void; setLocked(locked: boolean): void;
} {
  const fieldset = document.createElement('fieldset'); fieldset.id = 'local-lobby';
  const legend = document.createElement('legend'); legend.textContent = 'Local players (up to four)';
  const help = document.createElement('p'); help.id = 'local-lobby-help';
  help.textContent = 'Enable your players, then drag a colored device to a team or click it to switch sides. Control diagrams are below the pitch. Hold the shot button, then release to kick. Connect USB/Bluetooth controllers and press a button to detect them.';
  fieldset.append(legend, help); host.append(fieldset);
  const teams = document.createElement('div'); teams.className = 'team-drop-zones';
  let lockedState = false;
  const zones: Record<string, HTMLElement> = {};
  for (const [teamId, title] of [['home', 'Spain'], ['away', 'Argentina']]) {
    const zone = document.createElement('div'); zone.id=`team-${teamId}-zone`;zone.className = 'team-drop-zone'; zone.setAttribute('data-team', teamId); zone.setAttribute('aria-label', `${title} team drop zone`);
    const heading = document.createElement('strong'); heading.textContent = title; zone.append(heading); teams.append(zone); zones[teamId] = zone;
    zone.addEventListener('dragover', event => { event.preventDefault(); });
    zone.addEventListener('drop', event => { event.preventDefault();if(lockedState)return;const id = (event as DragEvent).dataTransfer?.getData('text/plain'); const row = rows[Number(id) - 1]; if (row&&row.enabled.checked&&!row.token.disabled) { row.team.value = teamId; updateStatus(); onChange?.(readSeats()); } });
  }
  fieldset.append(teams);
  const rows: Row[] = [];
  const option = (value: string, text: string) => { const item = document.createElement('option'); item.value = value; item.textContent = text; return item; };
  const label = (text: string, control: HTMLElement) => { const item = document.createElement('label'); const caption = document.createElement('span'); caption.textContent = text; item.append(caption, control); return item; };
  for (let n = 1; n <= 4; n++) {
    const row = document.createElement('div'); row.className = 'local-seat';
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.id = `seat-p${n}-enabled`; enabled.checked = n === 1;
    const team = document.createElement('select'); team.id = `seat-p${n}-team`; team.append(option('home', 'Home'), option('away', 'Away')); team.value = n % 2 ? 'home' : 'away';
    const device = document.createElement('select'); device.id = `seat-p${n}-device`;
    const initial = n === 1 ? 'keyboard1' : n === 2 ? 'keyboard2' : `gamepad:${n - 3}`;
    device.append(option(initial, initial)); device.value = initial;
    const status = document.createElement('span'); status.id = `seat-p${n}-status`; status.className = 'local-seat-status'; status.setAttribute('aria-live', 'polite');
    const token = document.createElement('button');token.id=`seat-p${n}-token`;token.type = 'button'; token.className = `player-token player-token-p${n}`; token.setAttribute('draggable', 'true');
    token.addEventListener('dragstart', event => { (event as DragEvent).dataTransfer?.setData('text/plain', String(n)); });
    token.addEventListener('click', () => { if (lockedState || !enabled.checked) return; team.value = team.value === 'home' ? 'away' : 'home'; updateStatus(); onChange?.(readSeats()); });
    row.append(label(`Player ${n}`, enabled), label('Team', team), label('Device', device), status); fieldset.append(row);
    rows.push({ enabled, team, device, status,token });
  }
  const readSeats = () => normalizeSeats(rows.flatMap((row, index) => row.enabled.checked ? [{ id: `p${index + 1}`, team: row.team.value, device: row.device.value }] : []));
  const readPads = () => typeof navigator === 'undefined' || !navigator.getGamepads ? [] : Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => !!pad && pad.connected);
  function updateStatus(): void {
    const pads = readPads(); const used = new Set<string>();const activeSeats=readSeats();
    rows.forEach((row,index) => {
      const value = row.device.value;
      const duplicate = row.enabled.checked && used.has(value);
      const seat=activeSeats.find(seat=>seat.id===`p${index+1}`);
      const device=seat?.device??value;
      const name=device.startsWith('gamepad:')?`🎮 Pad ${Number(device.slice(8))+1}`:`⌨ Keyboard ${device==='keyboard1'?1:2}`;
      row.token.textContent=`P${index+1} ${name}`;row.token.hidden=!seat;
      row.token.disabled=lockedState||!row.enabled.checked||duplicate;row.token.setAttribute('draggable',String(!row.token.disabled));
      row.token.setAttribute('aria-label',`Player ${index+1}, ${name}, ${seat?.team==='away'?'Argentina':'Spain'}. Click to switch teams or drag to the other team.`);
      const zone=zones[seat?.team??(row.team.value==='away'?'away':'home')];
      if(row.token.parentElement!==zone){
        const focused=document.activeElement===row.token;
        zone.append(row.token);
        if(focused&&!row.token.disabled)row.token.focus({preventScroll:true});
      }
      if (row.enabled.checked) used.add(value);
      let status = duplicate ? 'Device already assigned; this row is ignored.' : '';
      if (value.startsWith('gamepad:')) {
        const pad = pads.find(item => item.index === Number(value.slice(8)));
        const hardware = !pad ? 'Controller disconnected — connect USB/Bluetooth then press a button.' : pad.mapping !== 'standard' ? 'Controller unmapped — unsupported mapping; no gameplay input.' : 'Standard controller detected (physical mapping not verified).';
        status = status ? `${status} ${hardware}` : hardware;
      }
      if (!rows.some(item => item.enabled.checked) && row === rows[0]) status = 'Enable a player; otherwise Player 1 / keyboard 1 is used.';
      row.status.textContent = status;
    });
    for (const row of rows) for (const item of Array.from(row.device.children) as HTMLOptionElement[]) {
      item.disabled = rows.some(other => other !== row && other.enabled.checked && other.device.value === item.value) && item.value !== row.device.value;
    }
  }
  function refreshDevices(): void {
    const pads = readPads();
    for (const row of rows) {
      const selected = row.device.value;
      const options = [option('keyboard1', 'Keyboard 1 · WASD'), option('keyboard2', 'Keyboard 2 · arrows')];
      for (const pad of pads) options.push(option(`gamepad:${pad.index}`, `Controller ${pad.index + 1} · ${pad.mapping === 'standard' ? 'standard' : 'unmapped'}`));
      if (selected.startsWith('gamepad:') && !options.some(item => item.value === selected)) options.push(option(selected, `Controller ${Number(selected.slice(8)) + 1} · disconnected`));
      row.device.replaceChildren(...options); row.device.value = selected;
    }
    updateStatus();
  }
  for (const row of rows) for (const control of [row.enabled, row.team, row.device]) control.addEventListener('change', () => { updateStatus(); onChange?.(readSeats()); });
  // Setup events never bubble into the gameplay document listeners.
  for (const name of ['keydown', 'keyup', 'pointerdown', 'pointerup']) fieldset.addEventListener(name, event => event.stopPropagation());
  refreshDevices();
  return { readSeats, refreshDevices, setLocked(locked) {
    lockedState = locked; fieldset.disabled = locked;
    for (const row of rows) for (const control of [row.enabled, row.team, row.device]) control.disabled = locked;
    updateStatus();
  } };
}
