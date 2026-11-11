import { describe, expect, it } from 'vitest';
import { createGame, startGame, stepGame } from './engine.js';
import { EMPTY_INPUT } from './types.js';

describe('charged shooting', () => {
  it('starts only for the owner, charges, and releases with greater power', () => {
    const make = () => { const s = createGame(); for(const p of s.players.filter(p=>p.team==='away'))Object.assign(p,{x:14,y:8});startGame(s); return s; };
    const short = make(), full = make();
    stepGame(short, { ...EMPTY_INPUT, chargeStart: true }, 1 / 60);
    expect(short.ball.ownerId).toBe('home-0');
    expect(short.ball.release).toBeUndefined();
    expect(short.shotCharges?.p1?.value).toBe(0);
    for (let i = 0; i < 60; i++) stepGame(full, { ...EMPTY_INPUT,chargeStart:i===0, shootHeld: true, shotCharge: i / 60 }, 1 / 60);
    stepGame(full, { ...EMPTY_INPUT, shoot: true, shotCharge: 1 }, 1 / 60);
    stepGame(short, { ...EMPTY_INPUT, shoot: true, shotCharge: 0 }, 1 / 60);
    expect(full.ball.release?.type).toBe('shot');
    expect(Math.hypot(full.ball.vx, full.ball.vy)).toBeGreaterThan(Math.hypot(short.ball.vx, short.ball.vy));
  });
});