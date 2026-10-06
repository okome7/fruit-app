// Keep elapsed fractions when help pauses the clock; no reset on resume.
export function createCountdown(durationSeconds = 180, now = () => performance.now()) {
  let remainingMs = durationSeconds * 1000;
  let deadline = null;
  const read = () => deadline === null ? remainingMs : Math.max(0, deadline - now());
  return {
    get seconds() { return Math.ceil(read() / 1000); },
    get running() { return deadline !== null; },
    reset() { remainingMs = durationSeconds * 1000; deadline = null; },
    pause() { remainingMs = read(); deadline = null; },
    resume() { if (deadline === null && remainingMs > 0) deadline = now() + remainingMs; },
  };
}
