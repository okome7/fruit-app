export const BGM_URL = `${import.meta.env?.BASE_URL ?? '/'}audio/bgm.mp3`;

// One looping media element for the lifetime of the app, independent of SFX voices.
export function createBgmController(options = {}) {
  const createAudio = options.createAudio ?? ((url) => new Audio(url));
  const isHidden = options.isHidden ?? (() => globalThis.document?.visibilityState === 'hidden');
  let muted = Boolean(options.initialMuted);
  let activated = false;
  let disposed = false;
  let audio = null;
  let pending = null;

  function pause() {
    pending = null;
    try { audio?.pause(); } catch { /* Optional audio must not interrupt play. */ }
  }

  function play() {
    if (disposed || !activated || muted || isHidden()) return Promise.resolve(false);
    try {
      if (!audio) {
        audio = createAudio(options.url ?? BGM_URL);
        audio.loop = true;
        audio.volume = options.volume ?? 0.12;
        audio.preload = 'auto';
      }
      audio.muted = muted;
      if (pending) return pending;
      if (!audio.paused) return Promise.resolve(true);
      // Call synchronously while the user's click is still on the stack.
      const result = audio.play();
      const work = Promise.resolve(result).then(() => {
        if (disposed || muted || isHidden()) { pause(); return false; }
        return true;
      }).catch(() => false).finally(() => {
        if (pending === work) pending = null;
      });
      pending = work;
      return work;
    } catch {
      return Promise.resolve(false);
    }
  }

  return {
    startFromGesture() {
      if (disposed || muted || isHidden()) return Promise.resolve(false);
      activated = true;
      return play();
    },
    setMuted(value) {
      muted = Boolean(value);
      if (audio) audio.muted = muted;
      if (muted) pause();
      else if (activated) void play();
    },
    syncVisibility() {
      if (isHidden()) pause();
      else if (activated) void play();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pause();
      try { audio?.removeAttribute('src'); audio?.load(); } catch { /* Best effort cleanup. */ }
      audio = null;
    }
  };
}
