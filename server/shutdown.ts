import type { EventEmitter } from 'node:events';

/** Signal wiring is separate from the entrypoint so tests never start a server. */
export function registerShutdown(
  close: () => Promise<unknown>,
  signals: Pick<EventEmitter, 'on' | 'removeListener'>,
  onError: (error: unknown) => void,
): () => void {
  let closing = false;
  const dispose = () => {
    signals.removeListener('SIGINT', shutdown);
    signals.removeListener('SIGTERM', shutdown);
  };
  const shutdown = () => {
    if (closing) return;
    closing = true;
    // Keep the handlers while draining so a second signal cannot interrupt writes.
    void Promise.resolve().then(close).catch(onError).finally(dispose);
  };
  signals.on('SIGINT', shutdown);
  signals.on('SIGTERM', shutdown);
  return dispose;
}
