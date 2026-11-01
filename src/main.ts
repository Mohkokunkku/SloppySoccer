import './style.css';
import { createGame, startGame, stepGame } from '../shared/engine';
import { DEFAULT_CONFIG, type MatchConfig, type MatchResult } from '../shared/types';
import { InputController } from './input';
import { FixedStepper } from './loop';
import { formatTime, matchPresentation, sanitizeConfig, SaveOnce } from './model';
import { ToyRenderer } from './renderer';
import { mergeResults, parseResults } from './results';
import { completedPayload } from './ui';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');
app.innerHTML = `
  <main class="workshop">
    <header class="masthead">
      <a class="wordmark" href="/" aria-label="Sloppy Soccer home">Sloppy<span>Soccer<span class="logo-ball" aria-hidden="true">✳</span></span></a>
      <p class="tagline">Little legs. Big game.</p>
      <a class="design-link" href="/design-board.html">Inside the toy box <span aria-hidden="true">↗</span></a>
    </header>
    <section class="game-box" aria-label="Sloppy Soccer game">
      <div class="matchbar">
        <div class="scoreboard" aria-label="Match score and time">
          <span class="team home">Coral <strong id="home-score">0</strong></span>
          <span class="clock"><span class="clock-caption" id="phase-label">Kick-off</span><time id="clock">2:00</time></span>
          <span class="team away"><strong id="away-score">0</strong> Cobalt</span>
        </div>
        <button class="quiet-button" id="pause" type="button" disabled>Pause</button>
        <button class="quiet-button" id="restart" type="button" disabled>Restart</button>
      </div>
      <div class="stage has-overlay" id="stage">
        <div class="pitch" id="pitch"></div>
        <p class="goal-banner" id="goal-banner" role="status" hidden></p>
        <aside class="match-panel" id="match-panel" aria-labelledby="panel-title">
          <div class="toy-label" aria-hidden="true">4-a-side tabletop football</div>
          <h1 id="panel-title">Small teams.<br>Big nonsense.</h1>
          <p id="panel-copy">You're Coral. Take the little legs to the right-hand goal.</p>
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
            <button class="primary-button" id="start" type="submit">Start match <span aria-hidden="true">▶</span></button>
          </form>
          <div id="paused-actions" hidden><button class="primary-button" id="resume" type="button">Resume match <span aria-hidden="true">▶</span></button><button class="secondary-button" id="paused-restart" type="button">Restart match</button></div>
          <div id="finished-actions" hidden><p class="final-score" id="final-score"></p><p class="save-status" id="save-status" role="status"></p><button class="primary-button" id="rematch" type="button">Play again <span aria-hidden="true">↻</span></button><button class="secondary-button" id="new-setup" type="button">Change match settings</button></div>
        </aside>
      </div>
      <div class="control-strip">
        <p class="team-note"><span class="team-dot" aria-hidden="true"></span> You play Coral <span aria-hidden="true">→</span></p>
        <div class="keyboard-guide" aria-label="Keyboard controls"><span><kbd>WASD</kbd> / <kbd>↑↓←→</kbd> Move</span><span><kbd>Space</kbd> Shoot</span><span><kbd>E</kbd> Pass</span><span><kbd>Q</kbd> Switch</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>Esc</kbd> Pause</span></div>
        <button class="quiet-button touch-toggle" id="touch-toggle" type="button" aria-pressed="false" aria-controls="touch-controls">Touch controls</button>
      </div>
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
    <footer class="page-footer"><p>Eight tiny players. One very serious ball.</p><span>Made for a quick kickabout.</span></footer>
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
const input = new InputController();
const stepper = new FixedStepper();
const saves = new SaveOnce();
let config: MatchConfig = { ...DEFAULT_CONFIG };
let state = createGame(config);
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
    const home = document.createElement('span'); home.className = 'result-home'; home.textContent = `Coral ${result.home}`;
    const divider = document.createElement('span'); divider.className = 'result-divider'; divider.textContent = '–';
    const away = document.createElement('span'); away.className = 'result-away'; away.textContent = `${result.away} Cobalt`;
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
  const values = new FormData(setup);
  return sanitizeConfig({ duration: values.get('duration'), difficulty: values.get('difficulty') });
}
function applyConfig(): void {
  for (const field of setup.querySelectorAll<HTMLInputElement>('input')) {
    field.checked = field.value === String(config[field.name as keyof MatchConfig]);
  }
}
function focusPitch(): void { pitch.querySelector('canvas')?.focus({ preventScroll: true }); }
function clearInput(): void {
  input.clear(); stepper.reset(); lastFrame = 0;
  document.querySelectorAll('.is-held').forEach(button => button.classList.remove('is-held'));
}
function beginMatch(): void {
  if (!renderer) return;
  config = selectedConfig();
  state = createGame(config); // IDs stay stable; the renderer reuses its eight rigs.
  currentMatch = `match-${Date.now()}-${++matchNumber}`;
  finishedHandled = false;
  paused = false;
  clearInput();
  startGame(state);
  updateUI(); focusPitch();
}
function setPaused(value: boolean, moveFocus = true): void {
  if (state.phase !== 'playing' && state.phase !== 'goal') return;
  paused = value; clearInput(); updateUI();
  if (moveFocus) {
    if (paused) element('resume').focus({ preventScroll: true });
    else focusPitch();
  }
}
function resetSetup(): void {
  state = createGame(config); paused = false; finishedHandled = false;
  clearInput(); updateUI(); element('start').focus({ preventScroll: true });
}
function setText(node: HTMLElement, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}
function updateUI(): void {
  setText(element('home-score'), String(state.score.home));
  setText(element('away-score'), String(state.score.away));
  setText(element('clock'), formatTime(state.timeRemaining));
  const view = matchPresentation(state.phase, paused, state.score.home, state.score.away);
  const phaseLabel = paused ? 'Paused' : state.phase === 'ready' ? 'Kick-off' : state.phase === 'finished' ? 'Full time' : state.phase === 'goal' ? 'Goal!' : 'In play';
  setText(element('phase-label'), phaseLabel);
  const goal = element('goal-banner');
  goal.hidden = state.phase !== 'goal' || paused;
  const goalText = state.lastScorer === 'home' ? 'Coral scores!' : 'Cobalt scores!';
  if (goal.textContent !== goalText) goal.textContent = goalText;
  goal.classList.toggle('cobalt-goal', state.lastScorer === 'away');
  pauseButton.disabled = !renderer || (state.phase !== 'playing' && state.phase !== 'goal');
  setText(pauseButton, paused ? 'Resume' : 'Pause');
  restartButton.disabled = !renderer || state.phase === 'ready';
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
    ? "You're Coral. Take the little legs to the right-hand goal."
    : view.overlay === 'paused' ? 'The little legs can wait. Pick up exactly where you left off.'
    : 'Full time. Same tiny pitch, one more big chance?';
  if (view.overlay === 'finished') {
    element('final-score').textContent = `Coral ${state.score.home} – ${state.score.away} Cobalt`;
    announcer.textContent = `Full time. Coral ${state.score.home}, Cobalt ${state.score.away}. ${view.title}`;
    element('rematch').focus({ preventScroll: true });
  } else if (view.overlay === 'paused') announcer.textContent = 'Match paused.';
  else if (view.overlay === 'none') announcer.textContent = 'Match in play. You control Coral and attack right.';
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
  if (state.phase === 'ready') { state = createGame(config); updateUI(); }
});
pauseButton.addEventListener('click', () => setPaused(!paused));
element('resume').addEventListener('click', () => setPaused(false));
restartButton.addEventListener('click', beginMatch);
element('paused-restart').addEventListener('click', beginMatch);
element('rematch').addEventListener('click', beginMatch);
element('new-setup').addEventListener('click', resetSetup);

const gameKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyQ', 'ShiftLeft', 'ShiftRight']);
window.addEventListener('keydown', event => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (event.code === 'Escape' && !event.repeat) { event.preventDefault(); setPaused(!paused); return; }
  if (!paused && (state.phase === 'playing' || state.phase === 'goal') && gameKeys.has(event.code)) {
    // Buttons keep their native Space/Enter activation for keyboard users.
    if (target?.closest('button, a') && event.code === 'Space') return;
    event.preventDefault(); input.keyDown(event.code);
  }
});
window.addEventListener('keyup', event => input.keyUp(event.code));
function suspend(): void { clearInput(); setPaused(true, false); }
window.addEventListener('blur', suspend);
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-code]')) {
  const code = button.dataset.code!;
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
    if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); if (!paused && state.phase === 'playing') input.keyDown(code); }
  });
  button.addEventListener('keyup', event => { if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); input.keyUp(code); } });
  button.addEventListener('blur', () => input.keyUp(code));
}
const touchToggle = element<HTMLButtonElement>('touch-toggle');
const touchControls = element('touch-controls');
function showTouch(show: boolean): void {
  touchControls.hidden = !show; touchToggle.setAttribute('aria-pressed', String(show)); input.clear();
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
    if (!paused && !document.hidden && state.phase !== 'ready' && state.phase !== 'finished') {
      stepper.advance(delta, dt => stepGame(state, input.consume(), dt, config));
    }
    updateUI();
    if (state.phase === 'finished' && !finishedHandled) {
      finishedHandled = true;
      // finishMatch handles expected failures; this also catches storage/UI failures.
      void finishMatch().catch(() => { element('save-status').textContent = 'Score could not be saved. You can still play again.'; });
    }
    renderer?.render(state, now);
  });
  updateUI();
} catch { webglError(); }

readLocalResults(); renderResults();
void requestJSON('/api/config').then(value => {
  if (!settingsTouched && state.phase === 'ready') {
    config = sanitizeConfig(value); applyConfig(); state = createGame(config); updateUI();
  }
}).catch(() => { /* Built-in defaults are always playable. */ });
void requestJSON('/api/results').then(value => {
  serverResults = parseResults(value); renderResults();
  element('connection-status').textContent = 'Clubhouse connected. Recent matches on this device.';
}).catch(() => {
  element('connection-status').textContent = storageAvailable ? 'Clubhouse offline. Scores stay on this device.' : 'Clubhouse offline. Scores last for this visit only.';
});
