import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { readServerConfig } from './config.js';

describe('startup configuration (no server side effects)', () => {
  it('defaults to loopback port 3000 and absolute cwd-relative directories', () => {
    const cwd = resolve('server-config-fixture');
    expect(readServerConfig({}, cwd)).toEqual({
      host: '127.0.0.1', port: 3000,
      dataDir: resolve(cwd, 'data'), staticDir: resolve(cwd, 'dist'),
    });
  });
  it.each(['', ' ', '0', '65536', '-1', '3.5', '3000oops', '1e3', '0xBB8', 'Infinity', 'NaN'])('rejects invalid PORT=%j', port => {
    expect(() => readServerConfig({ PORT: port })).toThrow(/PORT/);
  });
  it.each(['1', '3000', '65535'])('accepts integer port %s', port => {
    expect(readServerConfig({ PORT: port }).port).toBe(Number(port));
  });
  it('resolves explicit directory settings and accepts a configured bind host', () => {
    const cwd = resolve('server-config-fixture');
    const dataDir = resolve(cwd, 'persistent');
    const staticDir = resolve(cwd, 'release', 'dist');
    expect(readServerConfig({ HOST: '0.0.0.0', PORT: '4321', DATA_DIR: dataDir, STATIC_DIR: staticDir }, cwd))
      .toEqual({ host: '0.0.0.0', port: 4321, dataDir, staticDir });
    expect(readServerConfig({ DATA_DIR: 'scores', STATIC_DIR: 'web' }, cwd))
      .toMatchObject({ dataDir: resolve(cwd, 'scores'), staticDir: resolve(cwd, 'web') });
  });
  it.each(['', '   ', 'http://localhost', 'localhost/path', 'bad host'])('rejects invalid HOST=%j', host => {
    expect(() => readServerConfig({ HOST: host })).toThrow(/HOST/);
  });
  it.each(['DATA_DIR', 'STATIC_DIR'])('rejects an empty %s', name => {
    expect(() => readServerConfig({ [name]: '' })).toThrow(name);
  });
});
