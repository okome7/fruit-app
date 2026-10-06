import test from "node:test";
import assert from "node:assert/strict";
import { createSfxController, SFX_STORAGE_KEY, useSfx } from "../src/composables/useSfx.js";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function fixture(overrides = {}) {
  let time = 1000;
  let hidden = false;
  const calls = { contexts: 0, fetches: 0, decodes: 0, resumes: 0, closes: 0, voices: [] };
  const saved = new Map();
  const decoded = { duration: 0.1 };
  const gain = { gain: { value: 1 }, connect() {}, disconnect() {} };
  const context = {
    state: "suspended", destination: {}, createGain: () => gain,
    async decodeAudioData() { calls.decodes++; return decoded; },
    async resume() { calls.resumes++; this.state = "running"; },
    async close() { calls.closes++; this.state = "closed"; },
    createBufferSource() {
      const source = {
        starts: 0, stops: 0, connects: 0, disconnects: 0,
        connect() { this.connects++; },
        disconnect() { this.disconnects++; },
        start() { this.starts++; },
        stop() { this.stops++; },
      };
      calls.voices.push(source);
      return source;
    },
  };
  const sfx = createSfxController({
    url: "/test/button.wav",
    initialMuted: false,
    createContext() { calls.contexts++; return context; },
    async fetch() { calls.fetches++; return { ok: true, async arrayBuffer() { return new ArrayBuffer(16); } }; },
    storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
    now: () => time,
    isHidden: () => hidden,
    ...overrides,
  });
  return { sfx, context, calls, saved, gain, decoded, advance: (ms = 100) => { time += ms; }, hide: value => { hidden = value; } };
}

test("preload fetches once without creating a context or starting playback", async () => {
  const f = fixture();
  const one = f.sfx.preload();
  assert.equal(one, f.sfx.preload());
  assert.equal(await one, true);
  await f.sfx.preload();
  assert.deepEqual([f.calls.contexts, f.calls.fetches, f.calls.decodes, f.calls.resumes], [0, 1, 0, 0]);
  assert.equal(f.calls.voices.length, 0);
  assert.equal(await f.sfx.play(), true);
  assert.equal(f.gain.gain.value, 0.18);
  f.sfx.dispose();
});

test("actual tap resumes synchronously, uses buffer again, throttles and limits to one voice", async () => {
  const f = fixture();
  await f.sfx.preload();
  const played = f.sfx.play();
  assert.equal(f.calls.resumes, 1);
  assert.equal(await played, true);
  assert.equal(await f.sfx.play(), false);
  f.advance();
  assert.equal(await f.sfx.play(), true);
  assert.equal(f.calls.voices[0].stops, 1);
  assert.equal(f.calls.voices[1].buffer, f.decoded);
  assert.deepEqual([f.calls.fetches, f.calls.decodes, f.calls.resumes], [1, 1, 1]);
  f.sfx.dispose();
});

test("tap before download is ready is dropped instead of playing late", async () => {
  const download = deferred();
  const f = fixture({ fetch: () => download.promise });
  assert.equal(await f.sfx.play(), false);
  const ready = f.sfx.preload();
  download.resolve({ ok: true, async arrayBuffer() { return new ArrayBuffer(2); } });
  assert.equal(await ready, true);
  assert.equal(f.calls.voices.length, 0);
  f.advance();
  assert.equal(await f.sfx.play(), true);
  f.sfx.dispose();
});

test("a slow resume cannot replay an old tap", async () => {
  const f = fixture();
  await f.sfx.preload();
  const resume = deferred();
  f.context.resume = () => resume.promise;
  const played = f.sfx.play();
  f.advance(500);
  f.context.state = "running";
  resume.resolve();
  assert.equal(await played, false);
  assert.equal(f.calls.voices.length, 0);
  f.sfx.dispose();
});

test("pending taps collapse to the latest one, never a queued burst", async () => {
  const f = fixture();
  await f.sfx.preload();
  const resume = deferred();
  f.context.resume = () => resume.promise;
  const oldTap = f.sfx.play();
  f.advance(100);
  const newTap = f.sfx.play();
  f.context.state = "running";
  resume.resolve();
  assert.deepEqual(await Promise.all([oldTap, newTap]), [false, true]);
  assert.equal(f.calls.voices.length, 1);
  f.sfx.dispose();
});

test("mute stops current audio; explicit ON gives one short confirmation", async () => {
  const f = fixture();
  await f.sfx.preload();
  await f.sfx.play();
  assert.equal(f.sfx.toggle(), true);
  assert.equal(f.sfx.muted.value, true);
  assert.equal(f.saved.get(SFX_STORAGE_KEY), "1");
  assert.equal(f.calls.voices[0].stops, 1);
  f.advance();
  assert.equal(await f.sfx.play(), false);
  assert.equal(f.sfx.toggle(), false);
  assert.equal(f.saved.get(SFX_STORAGE_KEY), "0");
  await new Promise(setImmediate);
  assert.equal(f.calls.voices.length, 2);
  f.sfx.dispose();
});

test("explicit OFF avoids loading and initializing audio", async () => {
  const f = fixture({ initialMuted: true, storage: { getItem: () => "1", setItem() {} } });
  assert.equal(f.sfx.muted.value, true);
  assert.equal(await f.sfx.preload(), false);
  assert.equal(await f.sfx.play(), false);
  assert.equal(f.calls.contexts, 0);
  f.sfx.dispose();
});

test("mute then unmute during resume invalidates the old tap", async () => {
  const f = fixture();
  await f.sfx.preload();
  const resume = deferred();
  f.context.resume = () => resume.promise;
  const played = f.sfx.play();
  f.sfx.setMuted(true);
  f.sfx.setMuted(false);
  f.context.state = "running";
  resume.resolve();
  assert.equal(await played, false);
  assert.equal(f.calls.voices.length, 0);
  f.sfx.dispose();
});

test("hidden tab and becoming hidden during resume stay silent", async () => {
  const f = fixture();
  f.hide(true);
  assert.equal(await f.sfx.play(), false);
  assert.equal(f.calls.contexts, 0);
  f.hide(false);
  await f.sfx.preload();
  const resume = deferred();
  f.context.resume = () => resume.promise;
  const played = f.sfx.play();
  f.hide(true);
  f.context.state = "running";
  resume.resolve();
  assert.equal(await played, false);
  f.sfx.dispose();
});

test("network, decode, resume, unsupported audio and storage failures are nonfatal", async () => {
  const fetchFailure = fixture({ fetch: async () => { throw new Error("offline"); } });
  assert.equal(await fetchFailure.sfx.preload(), false);
  assert.equal(await fetchFailure.sfx.play(), false);
  fetchFailure.sfx.dispose();
  const noAudio = fixture({ createContext: () => null });
  assert.equal(await noAudio.sfx.preload(), true);
  assert.equal(await noAudio.sfx.play(), false);
  noAudio.sfx.dispose();
  const broken = fixture({ storage: { getItem() { throw new Error(); }, setItem() { throw new Error(); } } });
  broken.context.decodeAudioData = async () => { throw new Error("decode"); };
  await broken.sfx.unlock();
  assert.equal(await broken.sfx.preload(), false);
  broken.context.resume = async () => { throw new Error("blocked"); };
  assert.equal(await broken.sfx.play(), false);
  assert.equal(broken.sfx.toggle(), true);
  broken.sfx.dispose();
});

test("dispose aborts loading, closes once and rejects future playback", async () => {
  const download = deferred();
  let signal;
  const f = fixture({ fetch: (_, options) => { signal = options.signal; return download.promise; } });
  await f.sfx.unlock();
  const loading = f.sfx.preload();
  f.sfx.dispose();
  f.sfx.dispose();
  assert.equal(signal.aborted, true);
  assert.equal(f.calls.closes, 1);
  download.resolve({ ok: true, async arrayBuffer() { return new ArrayBuffer(2); } });
  assert.equal(await loading, false);
  assert.equal(await f.sfx.play(), false);
  assert.equal(f.calls.decodes, 0);
});

test("useSfx shares a single controller and can create a new one after disposal", () => {
  const one = useSfx();
  assert.equal(useSfx(), one);
  one.dispose();
  const two = useSfx();
  assert.notEqual(one, two);
  two.dispose();
});

test("sound kinds share one context, cache each buffer and never overlap voices", async () => {
  const kinds = ['button', 'drop', 'success', 'retry'];
  const fetched = [];
  const f = fixture({
    urls: Object.fromEntries(kinds.map((kind) => [kind, `/${kind}.wav`])),
    async fetch(url) {
      fetched.push(url);
      return { ok: true, async arrayBuffer() { return Uint8Array.of(kinds.indexOf(url.slice(1, -4))).buffer; } };
    },
  });
  f.context.decodeAudioData = async (bytes) => ({ kind: kinds[new Uint8Array(bytes)[0]] });
  assert.equal(await f.sfx.preload(), true);
  assert.equal(await f.sfx.preload(), true);
  assert.equal(f.calls.contexts, 0);
  assert.equal(fetched.length, 4);
  for (const kind of kinds) {
    assert.equal(await f.sfx.play(kind), true);
    assert.equal(f.calls.voices.at(-1).buffer.kind, kind);
    if (f.calls.voices.length > 1) assert.equal(f.calls.voices.at(-2).stops, 1);
    f.advance();
  }
  f.sfx.setMuted(true);
  for (const kind of kinds) assert.equal(await f.sfx.play(kind), false);
  assert.equal(f.calls.voices.at(-1).stops, 1);
  assert.equal(f.calls.resumes, 1);
  f.sfx.dispose();
});

test("one failed sound can retry without discarding other cached sounds", async () => {
  let failed = true;
  const f = fixture({
    urls: { button: '/button.wav', success: '/success.wav' },
    async fetch(url) {
      return { ok: url !== '/success.wav' || !failed,
        async arrayBuffer() { return new ArrayBuffer(2); } };
    },
  });
  assert.equal(await f.sfx.preload(), false);
  assert.equal(await f.sfx.play('button'), true);
  failed = false;
  assert.equal(await f.sfx.preload('success'), true);
  f.advance(); assert.equal(await f.sfx.play('success'), true);
  f.sfx.dispose();
});

test("every page starts ON but preloads only bytes until a real interaction", async () => {
  const session = { type: 'auto' };
  const f = fixture({ initialMuted: undefined, audioSession: session,
    storage: { getItem: () => '1', setItem() {} } });
  assert.equal(f.sfx.muted.value, false);
  assert.equal(await f.sfx.preload(), true);
  assert.deepEqual([f.calls.contexts, f.calls.fetches, f.calls.decodes, f.calls.resumes], [0, 1, 0, 0]);
  assert.equal(session.type, 'auto');
  assert.equal(f.calls.voices.length, 0);
  const firstTap = f.sfx.play();
  assert.equal(f.calls.contexts, 1);
  assert.equal(f.calls.resumes, 1);
  assert.equal(session.type, 'playback');
  assert.equal(await firstTap, true);
  assert.equal(f.calls.voices.length, 1);
  f.sfx.dispose();
});

test("OFF as the first action does not create or resume audio", async () => {
  const session = { type: 'auto' };
  const f = fixture({ audioSession: session });
  await f.sfx.preload();
  assert.equal(f.sfx.toggle(), true);
  assert.equal(await f.sfx.play(), false);
  assert.equal(await f.sfx.unlock(), false);
  assert.deepEqual([f.calls.contexts, f.calls.resumes, f.calls.voices.length, session.type], [0, 0, 0, 'auto']);
  f.sfx.dispose();
});

test("ON selects playback before synchronous create/resume; OFF stops and restores the session", async () => {
  const order = [];
  let type = 'auto';
  const session = { get type() { return type; }, set type(value) { order.push(value); type = value; } };
  const f = fixture({ initialMuted: true, audioSession: session });
  const resume = f.context.resume;
  f.context.resume = function() { order.push('resume'); return resume.call(this); };
  assert.equal(f.sfx.toggle(), false);
  assert.deepEqual(order.slice(0, 2), ['playback', 'resume']);
  assert.equal(f.calls.contexts, 1);
  await new Promise(setImmediate);
  assert.equal(f.calls.voices.length, 1);
  assert.equal(f.sfx.toggle(), true);
  assert.equal(f.gain.gain.value, 0);
  assert.equal(f.calls.voices[0].stops, 1);
  assert.equal(type, 'auto');
  f.sfx.dispose();
});

test("rapid ON to OFF cancels confirmation playback even when its download completes", async () => {
  const download = deferred();
  const f = fixture({ initialMuted: true, audioSession: { type: 'auto' }, fetch: () => download.promise });
  f.sfx.toggle(); f.sfx.toggle();
  download.resolve({ ok: true, async arrayBuffer() { return new ArrayBuffer(2); } });
  await new Promise(setImmediate);
  assert.equal(f.calls.voices.length, 0);
  assert.equal(f.sfx.muted.value, true);
  f.sfx.dispose();
});

test("a slow ON sound is not replayed late and unsupported playback sessions remain safe", async () => {
  const download = deferred();
  const session = { get type() { return 'ambient'; }, set type(_) { throw new Error('unsupported'); } };
  const f = fixture({ initialMuted: true, audioSession: session, fetch: () => download.promise });
  f.sfx.toggle(); f.advance(1000);
  download.resolve({ ok: true, async arrayBuffer() { return new ArrayBuffer(2); } });
  await new Promise(setImmediate);
  assert.equal(f.calls.voices.length, 0);
  f.advance(); assert.equal(await f.sfx.play(), true);
  f.sfx.dispose();
});

test("the next trusted gesture retries a hung interrupted resume instead of waiting forever", async () => {
  const f = fixture(); await f.sfx.preload();
  f.context.state = 'interrupted';
  const first = deferred(); let resumes = 0;
  f.context.resume = async function() {
    resumes++;
    if (resumes === 1) return first.promise;
    this.state = 'running';
  };
  const stale = f.sfx.play();
  f.advance();
  assert.equal(await f.sfx.play(), true);
  assert.equal(resumes, 2);
  first.resolve(); assert.equal(await stale, false);
  assert.equal(f.calls.voices.length, 1);
  f.sfx.dispose();
});

test("an interruption during ON loading waits for another user gesture instead of resuming in a callback", async () => {
  const download = deferred();
  const f = fixture({ initialMuted: true, fetch: () => download.promise });
  f.sfx.toggle(); await Promise.resolve();
  assert.equal(f.calls.resumes, 1);
  f.context.state = 'interrupted';
  download.resolve({ ok: true, async arrayBuffer() { return new ArrayBuffer(2); } });
  await new Promise(setImmediate);
  assert.equal(f.calls.resumes, 1);
  assert.equal(f.calls.voices.length, 0);
  f.advance(); assert.equal(await f.sfx.play(), true);
  assert.equal(f.calls.resumes, 2);
  f.sfx.dispose();
});
