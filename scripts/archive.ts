import { run } from './process.js';
/** Extract the source.tar written by the local Git receiver. */
export async function extractSourceArchive(build: string): Promise<void> {
  // GNU tar treats a drive-letter colon as a remote host. Keep the archive
  // argument relative and select the native absolute directory through cwd.
  await run('tar', ['-xf', 'source.tar'], build);
}
