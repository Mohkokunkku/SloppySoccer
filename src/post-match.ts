import type { GameState } from '../shared/types';
import {FAIR_PLAY_DURATION} from './fair-play';

export type PostMatchView = {
  id: string;
  active: boolean;
  winner: 'home' | 'away' | null;
  theme: 0 | 1 | 2;
  elapsed: number;
  segment: 'winners' | 'losers' | 'finale' | 'handshake' | 'draw' | 'done';
};

export const POST_MATCH_HANDSHAKE_AT = 16;
export const POST_MATCH_DURATION = POST_MATCH_HANDSHAKE_AT+FAIR_PLAY_DURATION;
export const POST_MATCH_DRAW_HANDSHAKE_AT = 8;
export const POST_MATCH_DRAW_DURATION = POST_MATCH_DRAW_HANDSHAKE_AT+FAIR_PLAY_DURATION;
export const handshakeStart=(view:Pick<PostMatchView,'winner'>)=>view.winner===null?POST_MATCH_DRAW_HANDSHAKE_AT:POST_MATCH_HANDSHAKE_AT;
export const POST_MATCH_THEME_NAMES = ['Golden Boot', 'The Grandstand', 'After the Whistle'] as const;

export class PostMatchDirector {
  private readonly winner: PostMatchView['winner'];
  private readonly theme: 0 | 1 | 2;
  private elapsed = 0;
  private finished: boolean;

  constructor(state: Pick<GameState, 'phase' | 'score'>, private readonly id: string, random: () => number = Math.random) {
    const { home, away } = state.score;
    this.winner = home === away ? null : home > away ? 'home' : 'away';
    const sample = random();
    const safe = Number.isFinite(sample) ? Math.max(0, Math.min(1 - Number.EPSILON, sample)) : 0;
    this.theme = Math.min(2, Math.floor(safe * 3)) as 0 | 1 | 2;
    this.finished = false;
  }

  get view(): PostMatchView {
    const done = this.finished || this.elapsed >= (this.winner === null?POST_MATCH_DRAW_DURATION:POST_MATCH_DURATION);
    let segment: PostMatchView['segment'];
    if (done) segment = 'done';
    else if (this.elapsed>=handshakeStart({winner:this.winner})) segment = 'handshake';
    else if (this.winner === null) segment = 'draw';
    else if (this.elapsed < 6) segment = 'winners';
    else if (this.elapsed < 9) segment = 'losers';
    else if(this.elapsed < POST_MATCH_HANDSHAKE_AT) segment = 'finale';
    else segment = 'handshake';
    return { id: this.id, active: !done, winner: this.winner, theme: this.theme, elapsed: this.elapsed, segment };
  }

  update(dt: number, paused = false): PostMatchView {
    if (this.view.segment === 'done') { this.finished = true; return this.view; }
    const duration=this.winner===null?POST_MATCH_DRAW_DURATION:POST_MATCH_DURATION;
    if (!paused && Number.isFinite(dt) && dt > 0) this.elapsed = Math.min(this.elapsed + Math.min(dt, 0.25),duration);
    if(this.elapsed>=duration)this.finished=true;
    return this.view;
  }

  skip(): void { this.finished = true; }
}
