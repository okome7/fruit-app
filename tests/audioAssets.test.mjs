import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SFX_URLS } from '../src/composables/useSfx.js';

test('all four licensed sound files are valid short, non-clipping PCM WAVs with matching provenance', () => {
  const provenance = JSON.parse(readFileSync(new URL('../licenses/kenney-interface-sounds/bright-family/manifest.json', import.meta.url)));
  assert.equal(provenance.source.archive_member, 'Audio/bong_001.ogg');
  assert.equal(provenance.source.licence, 'CC0 1.0 Universal');
  const hashes = new Set();
  for (const url of Object.values(SFX_URLS)) {
    const file = url.split('/').at(-1);
    const bytes = readFileSync(new URL(`../public/audio/${file}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    let format, data;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = bytes.toString('ascii', offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      const chunk = bytes.subarray(offset + 8, offset + 8 + size);
      if (kind === 'fmt ') format = chunk;
      if (kind === 'data') data = chunk;
      offset += 8 + size + (size % 2);
    }
    assert.equal(format.readUInt16LE(0), 1);
    assert.equal(format.readUInt16LE(2), 1);
    assert.equal(format.readUInt32LE(4), 48000);
    assert.equal(format.readUInt16LE(14), 16);
    const duration = data.length / 2 / 48000;
    assert.ok(duration >= 0.08 && duration <= 0.7);
    let peak = 0;
    for (let offset = 0; offset < data.length; offset += 2) peak = Math.max(peak, Math.abs(data.readInt16LE(offset)));
    assert.ok(peak > 1000 && peak <= 10400);
    assert.equal(data.readInt16LE(0), 0);
    assert.equal(data.readInt16LE(data.length - 2), 0);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const asset = provenance.assets.find((asset) => asset.file === file);
    assert.equal(asset.sha256, hash);
    const pitches = asset.notes.map((note) => note[1]);
    assert.ok(pitches.every((pitch, index) => pitch >= 14 && (index === 0 || pitch >= pitches[index - 1])));
    hashes.add(hash);
  }
  assert.equal(hashes.size, 4);
});
