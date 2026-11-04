/** Shared blur/visibility suspension boundary; pause policy stays with the caller. */
export function suspendGame(audio: {quiet(): void}, clearInput: () => void, setPaused: (value: boolean, moveFocus: boolean) => void): void {
  audio.quiet();
  clearInput();
  setPaused(true, false);
}
