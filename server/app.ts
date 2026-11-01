import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_CONFIG } from '../shared/types.js';
import { createResultsRepository, type ResultInput } from './results.js';

export interface AppOptions {
  dataDir?: string;
  staticDir?: string;
}

export async function buildApp(options: AppOptions = {}) {
  const repository = await createResultsRepository(resolve(options.dataDir ?? 'data'));
  const app = Fastify({ bodyLimit: 1024, trustProxy: false,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } } });
  app.setErrorHandler<Error & { statusCode?: number }>((error, request, reply) => {
    const status = typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode : 500;
    if (status === 500) {
      request.log.error({ err: error }, 'Request failed');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
    return reply.code(status).send({ error: error.message });
  });
  app.addHook('onClose', async () => { await repository.drain(); });
  app.addHook('onSend', async (request, reply, payload) => {
    // Only the standalone art board needs inline CSS and its print-button handler.
    const isDesignBoard = request.raw.url?.split('?')[0] === '/design-board.html';
    const inline = isDesignBoard ? " 'unsafe-inline'" : '';
    reply.headers({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'cross-origin-resource-policy': 'same-origin',
      'cache-control': 'no-store',
      'content-security-policy': [
        "default-src 'self'", `script-src 'self'${inline}`, `style-src 'self'${inline}`,
        "img-src 'self' data:", "font-src 'self'", "connect-src 'self'",
        "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'none'",
      ].join('; '),
    });
    return payload;
  });
  app.addHook('onRequest', async (request, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin === undefined) return;
    let allowed = false;
    try {
      allowed = origin === new URL(origin).origin
        && origin === new URL(`${request.protocol}://${request.host}`).origin;
    } catch { /* Invalid and opaque origins are not same-origin. */ }
    if (!allowed) return reply.code(403).send({ error: 'Same-origin writes only' });
  });
  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/config', async () => DEFAULT_CONFIG);
  app.get('/api/results', async () => ({ results: repository.list() }));
  app.post<{ Body: ResultInput }>('/api/results', {
    schema: {
      body: {
        type: 'object', additionalProperties: false, required: ['home', 'away', 'duration'],
        properties: {
          home: { type: 'integer', minimum: 0, maximum: 99 },
          away: { type: 'integer', minimum: 0, maximum: 99 },
          duration: { type: 'number', minimum: 15, maximum: 600 },
        },
      },
    },
  }, async (request, reply) => {
    const result = await repository.add(request.body);
    return reply.code(201).send({ result });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'Not Found' }));
  const staticDir = resolve(options.staticDir ?? 'dist');
  let hasStatic = false;
  try {
    hasStatic = (await stat(staticDir)).isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (hasStatic) {
    await app.register(fastifyStatic, {
      root: staticDir,
      dotfiles: 'ignore',
      list: false,
      redirect: false,
      index: ['index.html'],
      maxAge: 0,
      allowedPath: path => !/^\/?api(?:\/|$)/.test(path),
    });
  }
  return app;
}
