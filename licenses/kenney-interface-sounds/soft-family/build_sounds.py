#!/usr/bin/env python3
"""Rebuild four quiet, related game sounds from Kenney's CC0 bong_001.

Dependencies: Python 3, NumPy, SciPy, ffmpeg on PATH. No network used.
Run: python build_sounds.py [--source-zip /path/to/kenney-interface-sounds.zip]
Without a ZIP argument, use the bundled original in originals/bong_001.ogg.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

import numpy as np
import scipy
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent
SR = 48_000
ZIP_SHA256 = "f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232"
SOURCE_SHA256 = "d21d0f0b782445db579d11e2506b24cd1ac9d664ee33aeaf807761aa7b6fd710"
SOURCE_MEMBER = "Audio/bong_001.ogg"
LICENCE_SHA256 = "f7966c773bbed0eca6a9c75081c44a178b38eae112724dbb5fdfbd4192d118a9"

# Onset in seconds, pitch relative to the original in semitones, relative gain.
# Brightness comes from the small rising major triad, not metallic overtones.
RECIPES = {
    "button-soft-pon-v2.wav": {
        "role": "button / ぽんっ", "duration": 0.125,
        "notes": [[0.0, 2, 1.0]], "target_rms_dbfs": -25.5,
    },
    "fruit-soft-koron-v2.wav": {
        "role": "fruit landing / ころん", "duration": 0.275,
        "notes": [[0.0, 2, 1.0], [0.125, -1, 0.72]],
        "target_rms_dbfs": -25.5,
    },
    "success-soft-v2.wav": {
        "role": "success / short rising major triad", "duration": 0.410,
        "notes": [[0.0, 2, 0.84], [0.125, 6, 0.91], [0.270, 9, 1.0]],
        "target_rms_dbfs": -25.0,
    },
    "retry-soft-v2.wav": {
        "role": "incorrect attempt / single gentle lower rounded reply", "duration": 0.175,
        "notes": [[0.0, -3, 1.0]],
        "target_rms_dbfs": -27.0,
    },
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def db(x: float) -> float:
    return float(20 * np.log10(max(x, 1e-15)))


def decode(source: Path) -> np.ndarray:
    raw = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(source),
        "-f", "f32le", "-ac", "1", "-ar", str(SR), "-",
    ])
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


def fade_edges(x: np.ndarray, attack: float = 0.0045,
               release: float = 0.027) -> np.ndarray:
    x = x.copy()
    attack_n = min(round(attack * SR), len(x) // 2)
    release_n = min(round(release * SR), len(x) // 2)
    x[:attack_n] *= np.sin(np.linspace(0, np.pi / 2, attack_n)) ** 2
    x[-release_n:] *= np.cos(np.linspace(0, np.pi / 2, release_n)) ** 2
    x[0] = x[-1] = 0.0
    return x


def voice(source: np.ndarray, semitones: float) -> np.ndarray:
    # Polyphase resampling changes pitch and shortens/lengthens the original
    # naturally. No oscillator, buzzer, reverb, or unrelated sample is added.
    ratio = Fraction(2 ** (-semitones / 12)).limit_denominator(10_000)
    y = signal.resample_poly(source, ratio.numerator, ratio.denominator)
    y = signal.sosfilt(signal.butter(2, 65, "highpass", fs=SR, output="sos"), y)
    y = signal.sosfilt(signal.butter(4, 1500, "lowpass", fs=SR, output="sos"), y)
    y = fade_edges(y)
    return y / max(np.max(np.abs(y)), 1e-12)


def render(source: np.ndarray, recipe: dict) -> np.ndarray:
    out = np.zeros(round(recipe["duration"] * SR), dtype=np.float64)
    for offset, semitones, gain in recipe["notes"]:
        note = voice(source, semitones) * gain
        start = round(offset * SR)
        assert start + len(note) <= len(out), "Recipe would truncate a note"
        out[start:start + len(note)] += note
    rms = np.sqrt(np.mean(out * out))
    out *= 10 ** (recipe["target_rms_dbfs"] / 20) / max(rms, 1e-12)
    # Conservative headroom, stricter than the requested -6 dBFS ceiling.
    peak_limit = 10 ** (-10.0 / 20)
    if np.max(np.abs(out)) > peak_limit:
        out *= peak_limit / np.max(np.abs(out))
    return out


def write_and_measure(name: str, x: np.ndarray) -> dict:
    p = ROOT / name
    pcm = np.rint(np.clip(x, -1, 1) * 32767).astype("<i2")
    wavfile.write(p, SR, pcm)
    rate, actual = wavfile.read(p)
    y = actual.astype(np.float64) / 32768
    assert rate == SR and actual.ndim == 1 and actual.dtype == np.int16
    assert np.max(np.abs(y)) <= 10 ** (-6 / 20)
    assert actual[0] == actual[-1] == 0
    f, spectrum = signal.welch(y, SR, nperseg=min(4096, len(y)))
    high_fraction = float(np.sum(spectrum[f >= 2000]) / max(np.sum(spectrum), 1e-30))
    return {
        "file": name, "sha256": sha(p.read_bytes()), "bytes": p.stat().st_size,
        "sample_rate": rate, "channels": 1, "encoding": "PCM signed 16-bit LE",
        "frames": len(actual), "duration_seconds": len(actual) / rate,
        "peak_dbfs": round(db(float(np.max(np.abs(y)))), 3),
        "rms_dbfs": round(db(float(np.sqrt(np.mean(y * y)))), 3),
        "dc_offset": float(np.mean(y)),
        "energy_fraction_above_2khz": high_fraction,
        "first_sample": int(actual[0]), "last_sample": int(actual[-1]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-zip", type=Path)
    args = parser.parse_args()
    original = ROOT / "originals" / "bong_001.ogg"
    original.parent.mkdir(parents=True, exist_ok=True)
    if args.source_zip:
        assert sha(args.source_zip.read_bytes()) == ZIP_SHA256, "Different source ZIP"
        with zipfile.ZipFile(args.source_zip) as z:
            original.write_bytes(z.read(SOURCE_MEMBER))
            (ROOT / "LICENSE-Kenney.txt").write_bytes(z.read("License.txt"))
    assert sha(original.read_bytes()) == SOURCE_SHA256, "Original sample hash mismatch"
    assert sha((ROOT / "LICENSE-Kenney.txt").read_bytes()) == LICENCE_SHA256

    source = decode(original)
    assets, samples = [], []
    for name, recipe in RECIPES.items():
        rendered = render(source, recipe)
        assets.append({**recipe, **write_and_measure(name, rendered)})
        # Build audition from final PCM bytes, preserving exactly the asset gain.
        _, pcm = wavfile.read(ROOT / name)
        samples.append(pcm.astype(np.float64) / 32767)
    # 400 ms lead-in, 650 ms between sounds, 500 ms tail. No speech or music.
    parts = [np.zeros(round(0.4 * SR))]
    timeline, cursor = [], 0.4
    for index, (name, sample) in enumerate(zip(RECIPES, samples)):
        timeline.append({"file": name, "starts_at_seconds": round(cursor, 3),
                         "ends_at_seconds": round(cursor + len(sample) / SR, 3)})
        parts.append(sample)
        cursor += len(sample) / SR
        if index < len(samples) - 1:
            parts.append(np.zeros(round(0.65 * SR)))
            cursor += 0.65
    parts.append(np.zeros(round(0.5 * SR)))
    audition = write_and_measure("audition-button-drop-success-retry.wav", np.concatenate(parts))
    manifest = {
        "source": {
            "creator": "Kenney", "pack": "Interface Sounds 1.0",
            "official_page": "https://kenney.nl/assets/interface-sounds",
            "licence": "CC0 1.0 Universal",
            "licence_url": "https://creativecommons.org/publicdomain/zero/1.0/",
            "archive_sha256": ZIP_SHA256, "archive_member": SOURCE_MEMBER,
            "original_sha256": SOURCE_SHA256, "licence_sha256": LICENCE_SHA256,
        },
        "transforms": {
            "decode": "ffmpeg to 48000 Hz mono float32",
            "pitch": "SciPy polyphase resampling, rational approximation denominator <=10000",
            "filters": "2nd-order Butterworth high-pass 65 Hz; 4th-order low-pass 1500 Hz",
            "edges": "4.5 ms raised-sine attack; 27 ms raised-cosine release; zero endpoints",
            "mix": "recipe note gains, then overall RMS target and hard -10 dBFS peak ceiling via linear scaling",
            "export": "round to mono signed PCM16 WAV; no random dither",
        },
        "verification": {
            "actual_listening": False,
            "note": "Technical signal/format verification only. No verified listening tool was available; perceived cuteness is not asserted as auditioned.",
            "numpy": np.__version__, "scipy": scipy.__version__,
            "ffmpeg": subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0],
        },
        "assets": assets, "audition": audition, "audition_timeline": timeline,
    }
    (ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"assets": assets, "audition_timeline": timeline}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
