export class FixedStepper {
  private accumulator = 0;
  readonly timestep = 1 / 60;
  reset(): void { this.accumulator = 0; }
  advance(delta: number, step: (dt: number) => void): number {
    this.accumulator += Math.min(0.1, Math.max(0, Number.isFinite(delta) ? delta : 0));
    let count = 0;
    while (this.accumulator + 1e-9 >= this.timestep && count < 6) {
      step(this.timestep);
      this.accumulator = Math.max(0, this.accumulator - this.timestep);
      count++;
    }
    return count;
  }
}
