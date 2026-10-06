import { readonly, ref } from "vue";

const AUDIO_BASE = `${import.meta.env?.BASE_URL ?? "/"}audio/`;
export const SFX_URLS = Object.freeze({
  button: `${AUDIO_BASE}button-soft-pon-v3.wav`,
  drop: `${AUDIO_BASE}fruit-soft-koron-v3.wav`,
  success: `${AUDIO_BASE}success-soft-v3.wav`,
  retry: `${AUDIO_BASE}retry-soft-v3.wav`,
});
export const SFX_STORAGE_KEY = "fruit-touch:sfx-muted:v1";

/**
 * One shared, best-effort UI sound family with a single voice. No audio is resumed or played by preload().
 * Call play()/unlock() directly in a real user gesture, not after a timer.
 * createSfxController's injectable platform boundary also permits DOM-free tests.
 */
export function createSfxController(options = {}) {
  const now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());
  const hidden = options.isHidden ?? (() => globalThis.document?.visibilityState === "hidden");
  const fetchAudio = options.fetch ?? ((...args) => globalThis.fetch(...args));
  const createContext = options.createContext ?? (() => {
    const Constructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return Constructor ? new Constructor({ latencyHint: "interactive" }) : null;
  });
  const urls = options.urls ?? (options.url ? { button: options.url } : SFX_URLS);
  const soundUrl = (kind) => urls[kind] ?? urls.button ?? Object.values(urls)[0];
  const volume = Math.max(0, Math.min(1, options.volume ?? 0.18));
  const throttleMs = options.throttleMs ?? 90;
  const maxLatencyMs = options.maxLatencyMs ?? 120;
  let storage;
  try { storage = options.storage ?? globalThis.localStorage; } catch { /* Private mode. */ }
  // Every new page starts ON. Fetching bytes is safe before interaction;
  // context creation, playback-session selection and resume still wait for a tap.
  const muted = ref(options.initialMuted ?? false);
  let context = null;
  let gain = null;
  const buffers = new Map();
  const audioBytes = new Map();
  const loading = new Map();
  let loadingAll = null;
  let selectedSession = null;
  let previousSessionType = null;
  const requests = new Map();
  let voice = null;
  let disposed = false;
  let generation = 0;
  let lastAttempt = -Infinity;

  function ensureContext() {
    if (disposed) return null;
    if (context?.state === "closed") { context = null; gain = null; }
    if (context) return context;
    try {
      const candidate = createContext();
      if (!candidate) return null;
      const output = candidate.createGain();
      output.gain.value = volume;
      output.connect(candidate.destination);
      context = candidate;
      gain = output;
      return context;
    } catch { return null; }
  }

  function stopVoice() {
    const previous = voice;
    voice = null;
    if (!previous) return;
    previous.onended = null;
    try { previous.stop(); } catch { /* It may have already ended. */ }
    try { previous.disconnect(); } catch { /* Cleanup must not affect the UI. */ }
  }

  /** Prefetch raw bytes; decode only after a user gesture has created a context. */
  function loadSound(kind) {
    if (disposed || muted.value) return Promise.resolve(false);
    const url = soundUrl(kind);
    if (!url) return Promise.resolve(false);
    if (buffers.has(url)) return Promise.resolve(true);
    if (loading.has(url)) return loading.get(url);
    if (audioBytes.has(url) && !context) return Promise.resolve(true);
    const request = new AbortController();
    requests.set(url, request);
    const work = (async () => {
      try {
        let bytes = audioBytes.get(url);
        if (!bytes) {
          const response = await fetchAudio(url, { signal: request.signal, cache: "force-cache" });
          if (!response.ok) return false;
          bytes = await response.arrayBuffer();
          if (disposed) return false;
          audioBytes.set(url, bytes);
        }
        if (disposed) return false;
        const currentContext = context;
        if (!currentContext || currentContext.state === 'closed') return true;
        // decodeAudioData may detach its argument; retain raw bytes for recovery.
        const decoded = await currentContext.decodeAudioData(bytes.slice(0));
        if (disposed || currentContext !== context) return false;
        buffers.set(url, decoded);
        return true;
      } catch { audioBytes.delete(url); return false; }
    })().finally(() => { loading.delete(url); requests.delete(url); });
    loading.set(url, work);
    return work;
  }

  function preload(kind) {
    if (kind !== undefined) return loadSound(kind);
    const kinds = Object.keys(urls);
    if (kinds.length === 1) return loadSound(kinds[0]);
    if (loadingAll) return loadingAll;
    loadingAll = Promise.all(kinds.map(loadSound))
      .then((results) => results.every(Boolean))
      .finally(() => { loadingAll = null; });
    return loadingAll;
  }

  function selectPlaybackSession() {
    if (selectedSession) return;
    try {
      const session = options.audioSession ?? globalThis.navigator?.audioSession;
      if (!session || !('type' in session)) return;
      const previous = session.type;
      // Standard Audio Session API, selected only during a user interaction.
      // Supporting WebKit uses playback rather than silent-switch-muted ambient.
      session.type = 'playback';
      selectedSession = session;
      previousSessionType = previous;
    } catch { /* Unsupported/restricted browsers retain their normal policy. */ }
  }

  function releasePlaybackSession() {
    try {
      if (selectedSession?.type === 'playback') selectedSession.type = previousSessionType ?? 'auto';
    } catch { /* Muting the gain and stopping the voice do not depend on this. */ }
    selectedSession = null;
    previousSessionType = null;
  }

  /** Resume only from a user gesture. A blocked/unsupported device stays silent. */
  function unlock() {
    if (disposed || muted.value || hidden()) return Promise.resolve(false);
    selectPlaybackSession();
    const currentContext = ensureContext();
    if (!currentContext) return Promise.resolve(false);
    if (currentContext.state === "running") return Promise.resolve(true);
    try {
      // Invoke resume synchronously while the trusted event is on the stack.
      const resumed = currentContext.resume();
      // Each later trusted gesture may retry; an unresolved iOS interruption
      // must not permanently block the next user-triggered resume attempt.
      return Promise.resolve(resumed)
        .then(() => !disposed && currentContext === context && currentContext.state === "running")
        .catch(() => false);
    } catch { return Promise.resolve(false); }
  }

  /** Never wait for an asset download, and never replay a stale interaction. */
  async function play(kind = "button") {
    if (disposed || muted.value || hidden()) return false;
    const startedAt = now();
    if (startedAt - lastAttempt < throttleMs) return false;
    lastAttempt = startedAt;
    const ticket = ++generation;
    const resumed = unlock();
    const url = soundUrl(kind);
    const alreadyFetched = audioBytes.has(url);
    let readyBuffer = buffers.get(url);
    const preparing = preload(kind);
    if (!readyBuffer && !alreadyFetched) return false; // Never wait for a network download from an old tap.
    const [running, prepared] = await Promise.all([resumed, preparing]);
    if (!running || !prepared) return false;
    readyBuffer ||= buffers.get(url);
    if (!readyBuffer) return false;
    if (disposed || muted.value || hidden() || ticket !== generation ||
        now() - startedAt > maxLatencyMs || context?.state !== "running") return false;
    stopVoice();
    let source;
    try {
      source = context.createBufferSource();
      source.buffer = readyBuffer;
      source.connect(gain);
      source.onended = () => {
        if (voice === source) voice = null;
        try { source.disconnect(); } catch { /* Optional cleanup. */ }
      };
      voice = source;
      source.start(0);
      return true;
    } catch {
      if (voice === source) stopVoice();
      return false;
    }
  }

  function setMuted(value) {
    if (disposed) return muted.value;
    muted.value = Boolean(value);
    ++generation; // Invalidate pending resumes, including mute -> unmute sequences.
    if (gain) gain.gain.value = muted.value ? 0 : volume;
    if (muted.value) { stopVoice(); releasePlaybackSession(); }
    try { storage?.setItem(SFX_STORAGE_KEY, muted.value ? "1" : "0"); } catch { /* Optional. */ }
    return muted.value;
  }

  function toggle() {
    const next = setMuted(!muted.value);
    if (!next) {
      const ticket = generation;
      const enabledAt = now();
      lastAttempt = -Infinity;
      // Both the session choice and resume happen synchronously in the ON tap.
      const resumed = unlock();
      const ready = preload('button');
      void Promise.all([resumed, ready]).then(([running, loaded]) => {
        if (running && loaded && context?.state === 'running' && !disposed && !muted.value && !hidden() &&
            ticket === generation && now() - enabledAt <= 800) return play('button');
        return false;
      });
      void ready.then(() => preload());
    }
    return next;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    ++generation;
    for (const request of requests.values()) request.abort();
    stopVoice();
    releasePlaybackSession();
    try { gain?.disconnect(); } catch { /* Optional cleanup. */ }
    try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Optional cleanup. */ }
    buffers.clear();
    audioBytes.clear();
    gain = null;
    context = null;
  }

  return {
    muted: readonly(muted), play, toggle, setMuted, unlock, preload, dispose,
    get disposed() { return disposed; },
  };
}

let sharedController;

/** Use once at the app root; all callers share its context, decoded buffer and mute state. */
export function useSfx() {
  if (!sharedController || sharedController.disposed) sharedController = createSfxController();
  return sharedController;
}
