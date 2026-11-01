import { buildApp } from './app.js';
import { readServerConfig } from './config.js';
import { registerShutdown } from './shutdown.js';

// Executable entrypoint only. Tests import config/app/shutdown, never this module.
try {
  const config = readServerConfig();
  const app = await buildApp({ dataDir: config.dataDir, staticDir: config.staticDir });
  const dispose = registerShutdown(() => app.close(), process, error => {
    console.error('Sloppy Soccer shutdown failed:', error);
    process.exitCode = 1;
  });
  app.addHook('onClose', async () => { dispose(); });
  try {
    const address = await app.listen({ host: config.host, port: config.port });
    console.info(`Sloppy Soccer listening at ${address}`);
  } catch (error) {
    dispose();
    await app.close();
    throw error;
  }
} catch (error) {
  console.error('Sloppy Soccer startup failed:', error);
  process.exitCode = 1;
}
