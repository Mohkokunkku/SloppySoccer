import { resolve } from 'node:path';

export interface ServerConfig {
  host: string;
  port: number;
  dataDir: string;
  staticDir: string;
}

/** Pure parsing: importing this module never opens sockets or reads/writes files. */
export function readServerConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ServerConfig {
  const host = env.HOST ?? '127.0.0.1';
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) throw new Error('HOST must be an IP address or hostname, not a URL.');
  const rawPort = env.PORT ?? '3000';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535.');
  }
  for (const name of ['DATA_DIR', 'STATIC_DIR'] as const) {
    if (env[name] !== undefined && env[name]!.trim() === '') throw new Error(`${name} must not be empty.`);
  }
  return {
    host, port,
    dataDir: resolve(cwd, env.DATA_DIR ?? 'data'),
    staticDir: resolve(cwd, env.STATIC_DIR ?? 'dist'),
  };
}
