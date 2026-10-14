import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SFX_URLS } from '../src/composables/useSfx.js';

// The user's selected sounds supersede the earlier synthesized four-sound family.
// These hashes identify the current files; they make no new licensing claim.
const expected = {
  'button.wav': '63dcad32f525009c57d6bff55805d20add074b588d13ac0a7d931dc65d1ad871',
  'newsuccess-soft-v3.wav': '2112332d7b66c813cdcd0032425c21427803da6b7d5bdfaf402c132fbd1584b0',
  'newretry-soft-v3.wav': '6e25480a74732acbed3f66a135067c1ff6dad3e59fe4a22ec13c7df6e4ab9769'
};
function asset(file) {
  const bytes = readFileSync(new URL(`../public/audio/${file}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected[file]);
  return bytes;
}

test('sound routing preserves the selected shared click/drop and distinct result sounds', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(SFX_URLS).map(([kind,url]) => [kind,url.split('/').at(-1)])), {
    button:'button.wav', drop:'button.wav', success:'newsuccess-soft-v3.wav', retry:'newretry-soft-v3.wav'
  });
  assert.equal(new Set(Object.values(SFX_URLS)).size,3);
});

test('selected button sound is an intact stereo 44.1 kHz PCM WAV with audible samples', () => {
  const bytes=asset('button.wav');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.readUInt32LE(4)+8,bytes.length);
  assert.equal(bytes.toString('ascii',8,12),'WAVE');
  let format,data;
  for (let offset=12; offset+8<=bytes.length;) {
    const size=bytes.readUInt32LE(offset+4);
    assert.ok(offset+8+size<=bytes.length);
    const chunk=bytes.subarray(offset+8,offset+8+size);
    if (bytes.toString('ascii',offset,offset+4)==='fmt ') format=chunk;
    if (bytes.toString('ascii',offset,offset+4)==='data') data=chunk;
    offset+=8+size+(size%2);
  }
  assert.ok(format && data);
  assert.equal(format.readUInt16LE(0),1);
  assert.equal(format.readUInt16LE(2),2);
  assert.equal(format.readUInt32LE(4),44100);
  assert.equal(format.readUInt16LE(14),16);
  assert.equal(data.length,44100*2*2);
  let peak=0;
  for (let i=0;i<data.length;i+=2) peak=Math.max(peak,Math.abs(data.readInt16LE(i)));
  assert.ok(peak>1000 && peak<32767);
});

test('selected result sounds have complete ID3-tagged MP3 frames despite their WAV filenames', () => {
  for (const [file,min,max] of [['newsuccess-soft-v3.wav',3,3.2],['newretry-soft-v3.wav',1.2,1.4]]) {
    const bytes=asset(file);
    assert.equal(bytes.toString('ascii',0,3),'ID3');
    assert.ok([2,3,4].includes(bytes[3]));
    let tagSize=0;
    for (let i=6;i<10;i++) { assert.ok(bytes[i]<128); tagSize=(tagSize<<7)|bytes[i]; }
    let offset=10+tagSize, frames=0, duration=0;
    while (offset<bytes.length) {
      assert.ok(offset+4<=bytes.length);
      const h=bytes.readUInt32BE(offset);
      assert.equal(h>>>21,0x7ff); assert.equal((h>>>19)&3,3); assert.equal((h>>>17)&3,1);
      const bitrate=[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320][(h>>>12)&15]*1000;
      const rate=[44100,48000,32000][(h>>>10)&3];
      assert.ok(bitrate && rate);
      offset+=Math.floor(144*bitrate/rate)+((h>>>9)&1);
      assert.ok(offset<=bytes.length);
      frames++; duration+=1152/rate;
    }
    assert.equal(offset,bytes.length); assert.ok(frames>20);
    assert.ok(duration>=min && duration<=max);
  }
});
