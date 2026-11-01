import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { registerShutdown } from './shutdown.js';

describe('graceful shutdown without starting a server', () => {
  it.each(['SIGINT', 'SIGTERM'])('closes only once and removes both signal listeners on %s', async signal => {
    const signals = new EventEmitter();
    const close = vi.fn(async () => {});
    const onError = vi.fn();
    registerShutdown(close, signals, onError);
    signals.emit(signal);
    signals.emit('SIGTERM');
    await new Promise(resolve => setImmediate(resolve));
    expect(close).toHaveBeenCalledTimes(1);
    expect(signals.listenerCount('SIGINT')).toBe(0);
    expect(signals.listenerCount('SIGTERM')).toBe(0);
    expect(onError).not.toHaveBeenCalled();
  });
  it('reports close failures rather than leaving an unhandled rejection', async () => {
    const signals = new EventEmitter();
    const error = new Error('close failed');
    const onError = vi.fn();
    registerShutdown(async () => { throw error; }, signals, onError);
    signals.emit('SIGINT');
    await new Promise(resolve => setImmediate(resolve));
    expect(onError).toHaveBeenCalledWith(error);
  });
  it('can detach listeners after an independently requested close', () => {
    const signals = new EventEmitter();
    const dispose = registerShutdown(async () => {}, signals, vi.fn());
    dispose();
    expect(signals.listenerCount('SIGINT')).toBe(0);
    expect(signals.listenerCount('SIGTERM')).toBe(0);
  });
});
