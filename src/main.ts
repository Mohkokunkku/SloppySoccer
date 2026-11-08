import './style.css';
import './international.css';
import './tuning-panel.css';
import './local-party.css';
import {applyTuning,DEFAULT_TUNING,sanitizeTuning} from '../shared/tuning';
import {mountTuningPanel} from './tuning-panel';
import {GameAudio} from './audio';
import {suspendGame} from './suspension';
import {DANCE_NAMES,celebrationStyle} from './celebrations';
import { createGame, startGame, skipIntro } from '../shared/engine';
import { stepQueuedGame } from './queued-game-step';
import { DEFAULT_CONFIG, type MatchConfig, type MatchResult, type LocalSeat } from '../shared/types';
import { assignLocalControls, humanControls } from '../shared/local-controls';
import { sanitizeFormations } from '../shared/formations';
import { LocalInputHub } from './local-input';
import { LocalInputQueue } from './local-input-queue';
import { mountLocalLobby } from './local-lobby';
import { FixedStepper } from './loop';
import { formatTime, matchPresentation, sanitizeConfig, SaveOnce } from './model';
import { ToyRenderer } from './renderer';
import { mergeResults, parseResults } from './results';
import { completedPayload, controlledRoleLabel } from './ui';
import { roleHint } from './role-hint';
import {localControlGuide,selectedLocalConfig} from './local-config';
import { PhaseAnnouncement } from './phase-announcement';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');
app.innerHTML = `
  <main class="workshop">
    <header class="masthead">
      <a class="wordmark" href="/" aria-label="Sloppy Soccer home">Sloppy<span>Soccer<span class="logo-ball" aria-hidden="true">✳</span></span></a>
      <p class="tagline">Spain vs Argentina · Local party</p>
      <a class="design-link" href="/squad.html">Meet Spain's squad <span aria-hidden="true">↗</span></a>
    </header>
    <section class="game-box" aria-label="Sloppy Soccer game">
      <div class="matchbar">
        <div class="scoreboard" aria-label="Match score and time">
          <span class="team home"><span class="country-flag flag-es" aria-hidden="true"></span> Spain <strong id="home-score">0</strong></span>
          <span class="clock"><span class="clock-caption" id="phase-label">Kick-off</span><time id="clock">2:00</time></span>
          <span class="team away"><strong id="away-score">0</strong> Argentina <span class="country-flag flag-ar" aria-hidden="true"></span></span>
        </div>
        <button class="quiet-button" id="pause" type="button" disabled>Pause</button>
        <button class="quiet-button" id="restart" type="button" disabled>Restart</button>
        <button class="quiet-button" id="change-players" type="button" disabled>Change players</button>
        <button class="quiet-button" id="skip-intro" type="button" hidden>Skip intro</button>
      </div>
      <div class="stage has-overlay" id="stage">
        <div class="pitch" id="pitch"></div>
        <p class="goal-banner" id="goal-banner" role="status" hidden></p>
        <aside class="match-panel" id="match-panel" aria-labelledby="panel-title">
          <div class="toy-label" aria-hidden="true">5-a-side tabletop football</div>
          <h1 id="panel-title">Small teams.<br>Big nonsense.</h1>
          <p id="panel-copy">Pick your teams and devices. Share a team or go head-to-head on this screen.</p>
          <form id="setup">
            <fieldset><legend>Opposition</legend><div class="choices">
              <label><input type="radio" name="difficulty" value="easy"><span>Easy</span></label>
              <label><input type="radio" name="difficulty" value="normal" checked><span>Normal</span></label>
              <label><input type="radio" name="difficulty" value="hard"><span>Hard</span></label>
            </div></fieldset>
            <fieldset><legend>Match length</legend><div class="choices">
              <label><input type="radio" name="duration" value="60"><span>1 min</span></label>
              <label><input type="radio" name="duration" value="120" checked><span>2 min</span></label>
              <label><input type="radio" name="duration" value="180"><span>3 min</span></label>
            </div></fieldset>
            <fieldset class="formation-field"><legend>Team tactics · four outfield + keeper</legend><div class="formation-options">
              <label for="formation-home">Spain tactic<select id="formation-home"><option value="2-1-1">2 DEF · 1 MID · 1 ATT</option><option value="1-2-1">1 DEF · 2 MID · 1 ATT</option></select></label>
              <label for="formation-away">Argentina tactic<select id="formation-away"><option value="2-1-1">2 DEF · 1 MID · 1 ATT</option><option value="1-2-1">1 DEF · 2 MID · 1 ATT</option></select></label>
            </div></fieldset>
            <div id="local-lobby-host"></div>
            <button class="primary-button" id="start" type="submit">Start match <span aria-hidden="true">▶</span></button>
          </form>
          <div id="paused-actions" hidden><button class="primary-button" id="resume" type="button">Resume match <span aria-hidden="true">▶</span></button><button class="secondary-button" id="paused-restart" type="button">Restart match</button></div>
          <div id="finished-actions" hidden><p class="final-score" id="final-score"></p><p class="save-status" id="save-status" role="status"></p><button class="primary-button" id="rematch" type="button">Play again <span aria-hidden="true">↻</span></button><button class="secondary-button" id="new-setup" type="button">Change match settings</button></div>
        </aside>
      </div>
      <div class="control-strip">
        <p class="team-note" id="local-team-note">P1 Spain →</p>
        <p class="team-note" aria-live="polite">Selected: <span id="controlled-role">Attacker</span></p>
        <div class="keyboard-guide" id="local-control-guide" aria-label="Active local player controls"></div>
        <button class="quiet-button touch-toggle" id="touch-toggle" type="button" aria-pressed="false" aria-controls="touch-controls">Touch controls</button>
      </div>
      <p id="local-input-status" class="local-input-status" role="status"></p>
      <div class="match-extras"><span class="role-legend">A Attacker &nbsp; M Midfield &nbsp; D Defender &nbsp; GK Keeper</span><button id="sound-toggle" type="button" class="quiet-button" aria-pressed="false">Sound off</button><button id="sound-test" type="button" class="quiet-button">Test sound</button><a href="/celebrations.html">Preview goal dances</a><span id="audio-status" role="status"></span></div>
      <div class="match-extras"><button id="sound-crowd" type="button" class="quiet-button">Hear crowd</button><button id="sound-goal" type="button" class="quiet-button">Hear goal music</button><details class="audio-credits"><summary>Audio credits</summary><p>Crowd: “Free Crowd Cheering Sounds” by Gregor Quendel, CC BY 4.0 (edited excerpts). Human voices and impacts: Kenney, CC0. Goal music: original synthesized instrumental. <a href="/audio-v2/CREDITS.md" target="_blank" rel="noopener">Sources, changes and licences</a></p></details></div>
      <div id="tuning-host"></div>
      <div class="touch-controls" id="touch-controls" aria-label="Touch game controls" hidden>
        <div class="dpad" role="group" aria-label="Move player">
          <button class="up" type="button" data-code="ArrowUp" aria-label="Move up">↑</button>
          <button class="left" type="button" data-code="ArrowLeft" aria-label="Move left">←</button>
          <button class="down" type="button" data-code="ArrowDown" aria-label="Move down">↓</button>
          <button class="right" type="button" data-code="ArrowRight" aria-label="Move right">→</button>
        </div>
        <div class="touch-actions" role="group" aria-label="Ball actions"><button class="shoot" type="button" data-code="Space">Shoot</button><button type="button" data-code="KeyE">Pass</button><button type="button" data-code="KeyQ">Switch</button><button type="button" data-code="ShiftLeft">Sprint</button></div>
      </div>
    </section>
    <section class="results-section" aria-labelledby="results-title">
      <div class="results-heading"><h2 id="results-title">Recent kickabouts</h2><p id="connection-status" role="status">Connecting to the clubhouse…</p></div>
      <ol class="results-list" id="results-list"></ol>
      <p class="empty-results" id="empty-results">No final whistles yet. Your first match starts above.</p>
    </section>
    <footer class="page-footer"><p>Ten tiny players. One very serious ball.</p><span>Up to four local players. One shared screen.</span></footer>
    <p class="sr-only" id="announcer" role="status" aria-live="polite"></p>
  </main>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing UI element: ${id}`);
  return node as T;
}
const pitch = element('pitch');
const stage = element('stage');
const panel = element('match-panel');
const setup = element<HTMLFormElement>('setup');
const pauseButton = element<HTMLButtonElement>('pause');
const restartButton = element<HTMLButtonElement>('restart');
const announcer = element('announcer');
const phaseAnnouncement = new PhaseAnnouncement();
const input = new LocalInputHub();
const inputQueue = new LocalInputQueue();
const stepper = new FixedStepper();
const saves = new SaveOnce();
const audio = new GameAudio();
let config: MatchConfig = { ...DEFAULT_CONFIG };
let tuning = {...DEFAULT_TUNING};
let localSeats:LocalSeat[]=[{id:'p1',team:'home',device:'keyboard1'}];
let localLobby:ReturnType<typeof mountLocalLobby>|null=null;
let lobbyLocked:boolean|null=null;
let lastDeviceRefresh=0;
function configuredGame(settings:MatchConfig){const next=createGame(settings);applyTuning(next,tuning);assignLocalControls(next,localSeats);return next;}
let state = configuredGame(config);
let paused = false;
let renderer: ToyRenderer | null = null;
let lastFrame = 0;
let lastView = '';
let matchNumber = 0;
let currentMatch = '';
let settingsTouched = false;
let finishedHandled = false;
let localResults: MatchResult[] = [];
let serverResults: MatchResult[] = [];
let storageAvailable = true;
const storageKey = 'sloppy-soccer.results.v1';

/** Every network operation is bounded; callers explicitly handle offline mode. */
async function requestJSON(url: string, options: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}
function readLocalResults(): void {
  try {
    const stored = localStorage.getItem(storageKey);
    localResults = stored ? parseResults(JSON.parse(stored)) : [];
  } catch { storageAvailable = false; }
}
function persistLocalResults(): void {
  try { localStorage.setItem(storageKey, JSON.stringify({ results: localResults })); }
  catch { storageAvailable = false; }
}
function renderResults(): void {
  const list = element<HTMLOListElement>('results-list');
  const results = mergeResults(localResults, serverResults).slice(0, 6);
  list.replaceChildren();
  for (const result of results) {
    const row = document.createElement('li');
    const score = document.createElement('p');
    const home = document.createElement('span'); home.className = 'result-home'; home.textContent = `Spain ${result.home}`;
    const divider = document.createElement('span'); divider.className = 'result-divider'; divider.textContent = '–';
    const away = document.createElement('span'); away.className = 'result-away'; away.textContent = `${result.away} Argentina`;
    score.append(home, divider, away);
    const detail = document.createElement('p'); detail.className = 'result-detail';
    const date = document.createElement('time'); date.dateTime = result.createdAt;
    date.textContent = new Date(result.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    detail.append(date, document.createTextNode(` / ${result.duration / 60} min`));
    row.append(score, detail); list.append(row);
  }
  element('empty-results').hidden = results.length > 0;
}
function selectedConfig(): MatchConfig {
  return selectedLocalConfig(setup.querySelectorAll<HTMLInputElement>('input[type="radio"]'),{home:element<HTMLSelectElement>('formation-home').value,away:element<HTMLSelectElement>('formation-away').value});
}
function applyConfig(): void {
  for (const field of setup.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    field.checked = field.value === String(config[field.name as keyof MatchConfig]);
  }
  const formations=sanitizeFormations(config.formations);
  element<HTMLSelectElement>('formation-home').value=formations.home;
  element<HTMLSelectElement>('formation-away').value=formations.away;
}
function focusPitch(): void { pitch.querySelector('canvas')?.focus({ preventScroll: true });stage.closest('.game-box')?.scrollIntoView({block:'start',behavior:'instant'}); }
function clearInput(): void {
  input.clear(); inputQueue.clear(); stepper.reset(); lastFrame = 0;
  document.querySelectorAll('.is-held').forEach(button => button.classList.remove('is-held'));
}
function beginMatch(): void {
  if (!renderer) return;
  config = selectedConfig();
  localSeats=localLobby?.readSeats()??localSeats;
  const pads=navigator.getGamepads?.()??[];
  const unavailable=localSeats.filter(seat=>seat.device.startsWith('gamepad:')&&(!pads[Number(seat.device.slice(8))]?.connected||pads[Number(seat.device.slice(8))]?.mapping!=='standard'));
  if(unavailable.length){setText(element('local-input-status'),`${unavailable.map(seat=>seat.id.toUpperCase()).join(', ')}: connect a standard-mapped controller and press a button, or choose a keyboard.`);return;}
  input.setSeats(localSeats);
  state = configuredGame(config); // Stable IDs; role/mould changes are renderer-owned.
  currentMatch = `match-${Date.now()}-${++matchNumber}`;
  finishedHandled = false;
  paused = false;
  clearInput();
  audio.reset();void audio.unlock();
  startGame(state,true,true);
  updateUI(); focusPitch();
}
function setPaused(value: boolean, moveFocus = true): void {
  if (state.phase !== 'playing' && state.phase !== 'goal' && state.phase !== 'resetting' && state.phase !== 'entering' && state.phase !== 'intro') return;
  paused = value;if(paused)audio.quiet();clearInput(); updateUI();
  if (moveFocus) {
    if (paused) element('resume').focus({ preventScroll: true });
    else focusPitch();
  }
}
function resetSetup(): void {
  audio.quiet();state = configuredGame(config); paused = false; finishedHandled = false;
  clearInput(); updateUI(); element('start').focus({ preventScroll: true });
}
function setText(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}
function updateUI(): void {
  setText(element('home-score'), String(state.score.home));
  setText(element('away-score'), String(state.score.away));
  setText(element('clock'), formatTime(state.timeRemaining));
  setText(element('controlled-role'), controlledRoleLabel(state));
  setText(element('local-team-note'),humanControls(state).map(control=>`${control.seatId.toUpperCase()} ${control.team==='home'?'Spain →':'Argentina ←'}`).join(' · '));
  const guide=localControlGuide(localSeats);
  setText(element('local-control-guide'),guide);
  const canvas=pitch.querySelector('canvas');
  const pitchLabel=`Sloppy Soccer tabletop pitch. ${guide}`;
  if(canvas&&canvas.getAttribute('aria-label')!==pitchLabel)canvas.setAttribute('aria-label',pitchLabel);
  const locked=state.phase!=='ready';
  if(lobbyLocked!==locked){lobbyLocked=locked;localLobby?.setLocked(locked);for(const control of setup.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input[type="radio"],#formation-home,#formation-away'))control.disabled=locked;}
  stage.classList.toggle('is-setup',state.phase==='ready');
  element<HTMLButtonElement>('change-players').disabled=!renderer||state.phase==='ready';
  element('skip-intro').hidden=state.phase!=='intro'||paused;
  const selectedRole = state.players.find(player => player.id === state.controlledId)?.tacticalRole;
  const hint = roleHint(selectedRole);
  if (element('controlled-role').title !== hint) element('controlled-role').title = hint;
  const view = matchPresentation(state.phase, paused, state.score.home, state.score.away);
  const phaseLabel = paused ? 'Paused' : state.phase === 'ready' ? 'Kick-off' : state.phase === 'entering' ? 'Teams entering' : state.phase === 'intro' ? 'Team spotlight' : state.phase === 'finished' ? 'Full time' : state.phase === 'goal' ? 'Goal!' : state.phase==='resetting'?'Back to kick-off':'In play';
  setText(element('phase-label'), phaseLabel);
  const goal = element('goal-banner');
  goal.hidden = (state.phase !== 'goal' && state.phase !== 'entering') || paused;
  const teamName=state.lastScorer==='home'?'Spain':'Argentina';
  const goalText = state.phase==='entering'?'Spain and Argentina take the field':teamName+' scores! '+DANCE_NAMES[celebrationStyle(state.score.home+state.score.away)];
  if (goal.textContent !== goalText) goal.textContent = goalText;
  goal.classList.toggle('cobalt-goal', state.lastScorer === 'away');
  goal.classList.toggle('entry-banner',state.phase==='entering');
  pauseButton.disabled = !renderer || (state.phase !== 'playing' && state.phase !== 'goal' && state.phase !== 'resetting' && state.phase !== 'entering' && state.phase !== 'intro');
  setText(pauseButton, paused ? 'Resume' : 'Pause');
  restartButton.disabled = !renderer || state.phase === 'ready';
  const soundButton=element<HTMLButtonElement>('sound-toggle');setText(soundButton,audio.enabled?'Sound on':'Sound off');soundButton.setAttribute('aria-pressed',String(audio.enabled));soundButton.dataset.played=String(audio.played);soundButton.dataset.active=String(audio.activeCount);soundButton.dataset.pending=String(audio.pendingCount);setText(element('audio-status'),audio.lastError??'');
  const announcement = phaseAnnouncement.update(state, paused, element('local-team-note').textContent ?? '');
  if (announcement !== null) setText(announcer, announcement);
  if (view.overlay === lastView) return;
  lastView = view.overlay;
  panel.hidden = view.overlay === 'none';
  stage.classList.toggle('has-overlay', view.overlay !== 'none');
  setup.hidden = view.overlay !== 'ready';
  element('paused-actions').hidden = view.overlay !== 'paused';
  element('finished-actions').hidden = view.overlay !== 'finished';
  const title = element('panel-title');
  title.textContent = view.overlay === 'ready' ? 'Small teams. Big nonsense.' : view.title;
  element('panel-copy').textContent = view.overlay === 'ready'
    ? 'Pick your teams and devices. Share a team or go head-to-head on this screen.'
    : view.overlay === 'paused' ? 'The little legs can wait. Pick up exactly where you left off.'
    : 'Full time. Same tiny pitch, one more big chance?';
  if (view.overlay === 'finished') {
    element('final-score').textContent = `Spain ${state.score.home} – ${state.score.away} Argentina`;
    element('rematch').focus({ preventScroll: true });
  }
}
async function finishMatch(): Promise<void> {
  const payload = completedPayload(state, config.duration);
  if (!payload) return;
  const id = currentMatch;
  const local: MatchResult = { ...payload, id, createdAt: new Date().toISOString() };
  localResults = mergeResults(localResults, [local]); persistLocalResults(); renderResults();
  element('save-status').textContent = 'Saving the final score…';
  try {
    await saves.run(id, async () => {
      const response = await requestJSON('/api/results', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = response && typeof response === 'object' ? (response as { result?: unknown }).result : undefined;
      const accepted = parseResults({ results: [result] });
      if (!accepted.length) throw new Error('Invalid saved result');
      localResults = mergeResults(localResults.filter(item => item.id !== id), accepted);
      serverResults = mergeResults(serverResults, accepted);
      persistLocalResults(); renderResults();
    });
    if (id === currentMatch) element('save-status').textContent = 'Final score saved to the clubhouse.';
    element('connection-status').textContent = 'Clubhouse connected. Recent matches on this device.';
  } catch {
    if (id === currentMatch) element('save-status').textContent = storageAvailable ? 'Clubhouse offline. Score saved on this device.' : 'Clubhouse offline. Score kept for this visit only.';
    element('connection-status').textContent = 'Clubhouse offline. You can still play.';
  }
}

setup.addEventListener('submit', event => { event.preventDefault(); settingsTouched = true; beginMatch(); });
setup.addEventListener('change', () => {
  settingsTouched = true; config = selectedConfig();
  localSeats=localLobby?.readSeats()??localSeats;input.setSeats(localSeats);
  if (state.phase === 'ready') { state = configuredGame(config); updateUI(); }
});
pauseButton.addEventListener('click', () => setPaused(!paused));
element('resume').addEventListener('click', () => setPaused(false));
restartButton.addEventListener('click', beginMatch);
element('paused-restart').addEventListener('click', beginMatch);
element('rematch').addEventListener('click', beginMatch);
element('new-setup').addEventListener('click', resetSetup);
element('change-players').addEventListener('click',resetSetup);
element('skip-intro').addEventListener('click',()=>{if(paused)return;skipIntro(state);clearInput();updateUI();focusPitch();});
localLobby=mountLocalLobby(element('local-lobby-host'),seats=>{settingsTouched=true;localSeats=seats;input.setSeats(seats);if(state.phase==='ready'){state=configuredGame(config);updateUI();}});
localSeats=localLobby.readSeats();input.setSeats(localSeats);
const refreshDevices=()=>{localLobby?.refreshDevices();};
window.addEventListener('gamepadconnected',refreshDevices);
window.addEventListener('gamepaddisconnected',refreshDevices);
element('sound-toggle').addEventListener('click',()=>{audio.setEnabled(!audio.enabled);updateUI();});
element('sound-test').addEventListener('click',()=>{audio.demo();updateUI();});
element('sound-crowd').addEventListener('click',()=>{if(!audio.enabled)audio.setEnabled(true);audio.play('crowd-shot');updateUI();});
element('sound-goal').addEventListener('click',()=>{if(!audio.enabled)audio.setEnabled(true);audio.play('goal');updateUI();});
mountTuningPanel(element('tuning-host'),()=>tuning,patch=>{tuning=sanitizeTuning(patch,tuning);applyTuning(state,tuning);updateUI();},focusPitch);
window.addEventListener('pagehide',()=>audio.quiet());

const gameKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'ShiftRight','Enter','Slash','Period']);
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); setPaused(!paused); return; }
  if (!paused && state.phase!=='ready' && state.phase!=='finished' && gameKeys.has(event.code)) {
    // Buttons keep their native Space/Enter activation for keyboard users.
    if (target?.closest('button, a') && (event.code === 'Space'||event.code==='Enter')) return;
    event.preventDefault(); input.keyDown(event.code, event.repeat);
  }
});
window.addEventListener('keyup', event => input.keyUp(event.code));
function suspend(): void { suspendGame(audio, clearInput, setPaused); }
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });

for (const [index,button] of [...document.querySelectorAll<HTMLButtonElement>('[data-code]')].entries()) {
  const sourceCode = button.dataset.code!;
  const code=({ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'}as Record<string,string>)[sourceCode]??sourceCode;
  button.addEventListener('pointerdown', event => {
    if (paused || state.phase !== 'playing' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); button.setPointerCapture(event.pointerId); input.pointerDown(event.pointerId, code);
    button.classList.add('is-held');
  });
  const release = (event: PointerEvent) => { input.pointerUp(event.pointerId); button.classList.remove('is-held'); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!paused && state.phase === 'playing') input.pointerDown(-index-1,code); }
  });
  button.addEventListener('keyup', event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); input.pointerUp(-index-1); } });
  button.addEventListener('blur', () => input.pointerUp(-index-1));
}
const touchToggle = element<HTMLButtonElement>('touch-toggle');
const touchControls = element('touch-controls');
function showTouch(show: boolean): void {
  touchControls.hidden = !show; touchToggle.setAttribute('aria-pressed', String(show)); clearInput();
}
showTouch(window.matchMedia('(pointer: coarse)').matches);
touchToggle.addEventListener('click', () => showTouch(Boolean(touchControls.hidden)));

function webglError(): void {
  renderer?.dispose(); renderer = null; clearInput();
  pitch.replaceChildren();
  const warning = document.createElement('div'); warning.className = 'webgl-error'; warning.setAttribute('role', 'alert');
  const title = document.createElement('h2'); title.textContent = 'The toy pitch needs WebGL.';
  const copy = document.createElement('p'); copy.textContent = 'Try enabling hardware acceleration in your browser, then reload. Your recent scores are still below.';
  const reload = document.createElement('button'); reload.type = 'button'; reload.className = 'primary-button'; reload.textContent = 'Reload the pitch'; reload.addEventListener('click', () => location.reload());
  warning.append(title, copy, reload); pitch.append(warning);
  element<HTMLButtonElement>('start').disabled = true;
  element('start').textContent = 'Pitch unavailable';
  pauseButton.disabled = true; restartButton.disabled = true;
  panel.hidden = true; stage.classList.remove('has-overlay');
}
try {
  renderer = new ToyRenderer(pitch, state);
  renderer.renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); webglError(); }, { once: true });
  renderer.start(now => {
    const delta = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    if(state.phase==='ready'&&now-lastDeviceRefresh>1000){refreshDevices();lastDeviceRefresh=now;}
    const polled=input.poll();
    let inputBoundary=false;
    if(polled.pausePressed){setPaused(!paused);inputBoundary=true;}
    if((polled.disconnected.length||polled.unsupported.length)&&state.phase!=='ready'&&state.phase!=='finished'){
      const warnings=[];
      if(polled.disconnected.length)warnings.push(`${polled.disconnected.map(id=>id.toUpperCase()).join(', ')} controller disconnected.`);
      if(polled.unsupported.length)warnings.push(`${polled.unsupported.map(id=>id.toUpperCase()).join(', ')} controller mapping unsupported.`);
      setText(element('local-input-status'),`${warnings.join(' ')} Connect a standard-mapped controller and press a button, then Resume, or use Change players for a new match.`);
      if(!paused){setPaused(true);inputBoundary=true;}
    }else if(state.phase!=='ready')setText(element('local-input-status'),'Local play · shared screen · no network multiplayer');
    if (!paused && !inputBoundary && !document.hidden && state.phase !== 'ready' && state.phase !== 'finished') {
      inputQueue.push(polled.inputs, polled.actionGroups);
      stepper.advance(delta, dt => {stepQueuedGame(state,inputQueue,dt,config);audio.update(state);});
    }else{
      inputQueue.clear();
    }
    updateUI();
    if (state.phase === 'finished' && !finishedHandled) {
      finishedHandled = true;
      // finishMatch handles expected failures; this also catches storage/UI failures.
      void finishMatch().catch(() => { element('save-status').textContent = 'Score could not be saved. You can still play again.'; });
    }
    renderer?.render(state, now,paused);
  });
  updateUI();
} catch { webglError(); }

readLocalResults(); renderResults();
void requestJSON('/api/config').then(value => {
  if (!settingsTouched && state.phase === 'ready') {
    config = sanitizeConfig(value); applyConfig(); state = configuredGame(config); updateUI();
  }
}).catch(() => { /* Built-in defaults are always playable. */ });
void requestJSON('/api/results').then(value => {
  serverResults = parseResults(value); renderResults();
  element('connection-status').textContent = 'Clubhouse connected. Recent matches on this device.';
}).catch(() => {
  element('connection-status').textContent = storageAvailable ? 'Clubhouse offline. Scores stay on this device.' : 'Clubhouse offline. Scores last for this visit only.';
});
