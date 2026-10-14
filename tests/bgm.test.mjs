import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBgmController, BGM_URL } from '../src/lib/bgm.js';

function fixture() {
  let hidden = false;
  const calls = { creates: 0, plays: 0, pauses: 0, loads: 0 };
  const audio = { paused: true, currentTime: 12,
    play() { calls.plays++; this.paused = false; return Promise.resolve(); },
    pause() { calls.pauses++; this.paused = true; },
    removeAttribute(name) { assert.equal(name, 'src'); },
    load() { calls.loads++; }
  };
  const bgm = createBgmController({
    createAudio(url) { assert.equal(url, BGM_URL); calls.creates++; return audio; },
    isHidden: () => hidden
  });
  return { bgm, audio, calls, hide(value) { hidden = value; bgm.syncVisibility(); } };
}

test('no autoplay before interaction; repeated gestures share one looping player', async () => {
  const f = fixture();
  f.bgm.setMuted(false); f.hide(false);
  assert.equal(f.calls.creates, 0);
  await f.bgm.startFromGesture();
  await f.bgm.startFromGesture();
  assert.equal(f.calls.creates, 1); assert.equal(f.calls.plays, 1);
  assert.equal(f.audio.loop, true); assert.equal(f.audio.volume, 0.12);
  f.bgm.dispose();
});

test('sound OFF pauses immediately; ON resumes the same position and player', async () => {
  const f = fixture();
  f.bgm.setMuted(true);
  assert.equal(await f.bgm.startFromGesture(), false);
  assert.equal(f.calls.creates, 0);
  f.bgm.setMuted(false); await f.bgm.startFromGesture();
  f.bgm.setMuted(true);
  assert.equal(f.audio.paused, true); assert.equal(f.audio.muted, true);
  f.bgm.setMuted(false);
  assert.equal(f.calls.plays, 2); assert.equal(f.calls.creates, 1);
  assert.equal(f.audio.currentTime, 12);
  f.bgm.dispose();
});

test('hidden page pauses, returning resumes only after prior interaction', async () => {
  const f = fixture();
  f.hide(true); f.hide(false); assert.equal(f.calls.creates, 0);
  await f.bgm.startFromGesture();
  f.hide(true); assert.equal(f.audio.paused, true);
  f.hide(false); assert.equal(f.calls.plays, 2);
  f.bgm.dispose();
});

test('blocked playback is handled and retried on the next interaction', async () => {
  const f = fixture();
  f.audio.play = () => { f.calls.plays++; return Promise.reject(new Error('NotAllowedError')); };
  assert.equal(await f.bgm.startFromGesture(), false);
  f.audio.play = () => { f.calls.plays++; f.audio.paused=false; return Promise.resolve(); };
  assert.equal(await f.bgm.startFromGesture(), true);
  assert.equal(f.calls.creates, 1); assert.equal(f.calls.plays, 2);
  f.bgm.dispose();
});

test('a pending play cannot escape mute or disposal, and rapid taps do not overlap', async () => {
  const f = fixture(); let resolve;
  f.audio.play = () => { f.calls.plays++; return new Promise(r => { resolve=r; }); };
  const first = f.bgm.startFromGesture(); const second = f.bgm.startFromGesture();
  assert.equal(f.calls.plays, 1);
  f.bgm.setMuted(true); resolve();
  assert.deepEqual(await Promise.all([first,second]),[false,false]);
  assert.equal(f.audio.muted,true); assert.equal(f.audio.paused,true);
  f.bgm.dispose(); f.bgm.dispose();
  assert.equal(f.calls.loads,1); assert.equal(await f.bgm.startFromGesture(),false);
});

test('BGM playback copy preserves the original and contains complete MPEG-1 Layer III frames', () => {
  const bytes = readFileSync(new URL('../public/audio/bgm.mp3',import.meta.url));
  assert.deepEqual(bytes,readFileSync(new URL('../public/audio/bgm.wav',import.meta.url)));
  let offset=0, frames=0, duration=0;
  while (offset < bytes.length) {
    const h=bytes.readUInt32BE(offset);
    assert.equal(h >>> 21,0x7ff); assert.equal((h >>> 19)&3,3); assert.equal((h >>> 17)&3,1);
    const bitrate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][(h>>>12)&15]*1000;
    const rate=[44100,48000,32000][(h>>>10)&3];
    assert.ok(bitrate && rate);
    offset+=Math.floor(144*bitrate/rate)+((h>>>9)&1); frames++; duration+=1152/rate;
  }
  assert.equal(offset,bytes.length); assert.ok(frames>100); assert.ok(duration>10);
});
