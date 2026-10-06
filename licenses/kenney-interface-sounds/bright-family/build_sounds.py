#!/usr/bin/env python3
"""Rebuild the brighter v3 fruit-game sound family from Kenney's CC0 bong_001.

Dependencies: Python 3, NumPy, SciPy, ffmpeg on PATH. No network used.
Run: python build_sounds.py [--source-zip ARCHIVE] [--previous-dir V2_FOLDER]
Without a ZIP argument, use the bundled original in originals/bong_001.ogg.
A v2 folder updates reference-v2.json with independently measured reference PCM.
"""
from __future__ import annotations
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile
import numpy as np
import scipy
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent
SR = 48_000
ZIP_SHA256 = 'f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232'
SOURCE_SHA256 = 'd21d0f0b782445db579d11e2506b24cd1ac9d664ee33aeaf807761aa7b6fd710'
SOURCE_MEMBER = 'Audio/bong_001.ogg'
LICENCE_SHA256 = 'f7966c773bbed0eca6a9c75081c44a178b38eae112724dbb5fdfbd4192d118a9'
AUDITION_NAME = 'audition-button-drop-success-retry-v3.wav'
FRIENDLY_AUDITION_NAME = 'くだものやさん_明るい効果音4種類_v3.wav'

# Onset seconds, pitch relative to original semitones, relative note gain.
# Higher fundamentals and upward intervals provide brightness without harsh highs.
RECIPES = {
 'button-soft-pon-v3.wav': {
  'role': 'button / short bright rounded pon', 'duration': 0.080,
  'notes': [[0.0,14,1.0]], 'target_rms_dbfs': -25.50,
  'previous_file': 'button-soft-pon-v2.wav',
 },
 'fruit-soft-koron-v3.wav': {
  'role': 'fruit landing / two lightly rising rounded notes', 'duration': 0.160,
  'notes': [[0.0,14,1.0],[0.085,18,0.82]], 'target_rms_dbfs': -26.85,
  'previous_file': 'fruit-soft-koron-v2.wav',
 },
 'success-soft-v3.wav': {
  'role': 'success / short rising major triad', 'duration': 0.250,
  'notes': [[0.0,14,0.84],[0.095,18,0.91],[0.195,21,1.0]],
  'target_rms_dbfs': -26.60, 'previous_file': 'success-soft-v2.wav',
 },
 'retry-soft-v3.wav': {
  'role': 'retry / brief gentle higher neutral note', 'duration': 0.090,
  'notes': [[0.0,16,1.0]], 'target_rms_dbfs': -27.0,
  'previous_file': 'retry-soft-v2.wav',
 },
}

def sha(data: bytes) -> str:
 return hashlib.sha256(data).hexdigest()

def db(x: float) -> float:
 return float(20*np.log10(max(float(x),1e-15)))

def decode(source: Path) -> np.ndarray:
 raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ac','1','-ar',str(SR),'-'])
 return np.frombuffer(raw,dtype='<f4').astype(np.float64)

def fade_edges(x: np.ndarray, attack: float=0.004, release: float=0.018) -> np.ndarray:
 x=x.copy()
 a=min(round(attack*SR),len(x)//2)
 r=min(round(release*SR),len(x)//2)
 x[:a]*=np.sin(np.linspace(0,np.pi/2,a))**2
 x[-r:]*=np.cos(np.linspace(0,np.pi/2,r))**2
 x[0]=x[-1]=0.0
 return x

def voice(source: np.ndarray, semitones: float) -> np.ndarray:
 ratio=Fraction(2**(-semitones/12)).limit_denominator(10_000)
 y=signal.resample_poly(source,ratio.numerator,ratio.denominator)
 y=signal.sosfilt(signal.butter(2,100,'highpass',fs=SR,output='sos'),y)
 y=signal.sosfilt(signal.butter(4,1900,'lowpass',fs=SR,output='sos'),y)
 y=fade_edges(y)
 return y/max(float(np.max(np.abs(y))),1e-12)

def render(source: np.ndarray, recipe: dict) -> np.ndarray:
 out=np.zeros(round(recipe['duration']*SR),dtype=np.float64)
 for onset,semitones,gain in recipe['notes']:
  note=voice(source,semitones)*gain
  start=round(onset*SR)
  assert start+len(note)<=len(out),'Recipe would truncate a note'
  out[start:start+len(note)]+=note
 out*=10**(recipe['target_rms_dbfs']/20)/max(np.sqrt(np.mean(out*out)),1e-12)
 # Linear attenuation only; no clipped peaks, limiter, or compression.
 ceiling=10**(-10.0/20)
 if np.max(np.abs(out))>ceiling:
  out*=ceiling/np.max(np.abs(out))
 return out

def measure(path: Path) -> dict:
 rate,pcm=wavfile.read(path)
 assert rate==SR and pcm.ndim==1 and pcm.dtype==np.int16
 y=pcm.astype(np.float64)/32768
 f,p=signal.periodogram(y,rate,window='boxcar',nfft=262144,detrend=False)
 total=max(float(np.sum(p)),1e-30)
 return {
  'file':path.name,'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size,
  'sample_rate':rate,'channels':1,'encoding':'PCM signed 16-bit LE',
  'frames':len(pcm),'duration_seconds':len(pcm)/rate,
  'peak_dbfs':round(db(np.max(np.abs(y))),4),
  'rms_dbfs':round(db(np.sqrt(np.mean(y*y))),4),
  'dominant_hz':round(float(f[np.argmax(p)]),3),
  'spectral_centroid_hz':round(float(np.sum(f*p)/total),3),
  'energy_fraction_above_2khz':float(np.sum(p[f>=2000])/total),
  'energy_fraction_above_4khz':float(np.sum(p[f>=4000])/total),
  'dc_offset':float(np.mean(y)),
  'first_sample':int(pcm[0]),'last_sample':int(pcm[-1]),
  'max_absolute_sample':int(np.max(np.abs(pcm.astype(np.int32)))),
 }

def write_pcm(name: str, pcm: np.ndarray) -> dict:
 assert pcm.dtype==np.int16 and pcm.ndim==1
 wavfile.write(ROOT/name,SR,pcm)
 return measure(ROOT/name)

def export(name: str, y: np.ndarray) -> dict:
 # Clipping is forbidden and asserted before quantization.
 assert np.max(np.abs(y))<1.0
 return write_pcm(name,np.rint(y*32767).astype('<i2'))

def main() -> None:
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--source-zip',type=Path)
 parser.add_argument('--previous-dir',type=Path)
 args=parser.parse_args()
 original=ROOT/'originals'/'bong_001.ogg'
 original.parent.mkdir(parents=True,exist_ok=True)
 if args.source_zip:
  assert sha(args.source_zip.read_bytes())==ZIP_SHA256,'Different source archive'
  with zipfile.ZipFile(args.source_zip) as z:
   original.write_bytes(z.read(SOURCE_MEMBER))
   (ROOT/'LICENSE-Kenney.txt').write_bytes(z.read('License.txt'))
 assert sha(original.read_bytes())==SOURCE_SHA256,'Original sample hash mismatch'
 assert sha((ROOT/'LICENSE-Kenney.txt').read_bytes())==LICENCE_SHA256
 if args.previous_dir:
  refs={r['previous_file']:measure(args.previous_dir/r['previous_file']) for r in RECIPES.values()}
  (ROOT/'reference-v2.json').write_text(json.dumps(refs,indent=2,ensure_ascii=False)+'\n')
 refs=json.loads((ROOT/'reference-v2.json').read_text())
 source=decode(original)
 assets=[]
 parts=[np.zeros(round(.4*SR),dtype='<i2')]
 timeline=[]
 cursor=len(parts[0])
 comparisons=[]
 checks=[]
 for index,(name,recipe) in enumerate(RECIPES.items()):
  rendered=render(source,recipe)
  assert np.array_equal(rendered,render(source,recipe)),'Rendering is not deterministic'
  asset={**recipe,**export(name,rendered)}
  assets.append(asset)
  _,pcm=wavfile.read(ROOT/name)
  timeline.append({'file':name,'start_frame':cursor,'end_frame':cursor+len(pcm),
   'starts_at_seconds':cursor/SR,'ends_at_seconds':(cursor+len(pcm))/SR})
  parts.append(pcm);cursor+=len(pcm)
  if index<len(RECIPES)-1:
   gap=np.zeros(round(.65*SR),dtype='<i2');parts.append(gap);cursor+=len(gap)
  old=refs[recipe['previous_file']]
  comparisons.append({
   'v2_file':old['file'],'v3_file':name,
   'v2_sha256':old['sha256'],'v3_sha256':asset['sha256'],
   'dominant_hz':{'v2':old['dominant_hz'],'v3':asset['dominant_hz']},
   'centroid_hz':{'v2':old['spectral_centroid_hz'],'v3':asset['spectral_centroid_hz']},
   'peak_dbfs':{'v2':old['peak_dbfs'],'v3':asset['peak_dbfs']},
   'rms_dbfs':{'v2':old['rms_dbfs'],'v3':asset['rms_dbfs']},
   'rms_difference_db':round(asset['rms_dbfs']-old['rms_dbfs'],4),
  })
  assert asset['first_sample']==asset['last_sample']==0
  assert asset['peak_dbfs']<=-9.999
  assert asset['dominant_hz']>=450
  assert asset['spectral_centroid_hz']>1.75*old['spectral_centroid_hz']
  assert asset['energy_fraction_above_4khz']<0.0005
  assert abs(asset['rms_dbfs']-old['rms_dbfs'])<0.5
  # Note-end jumps must be at most 2 PCM steps into the trailing silence.
  smooth_ends=[]
  for onset,semitones,gain in recipe['notes']:
   end=round(onset*SR)+len(voice(source,semitones))-1
   step=int(abs(int(pcm[end])-int(pcm[end-1])))
   smooth_ends.append(step)
   assert step<=2
  subprocess.run(['ffmpeg','-v','error','-i',str(ROOT/name),'-f','null','-'],check=True)
  checks.append({'file':name,'decode':'pass','format':'48000 Hz mono PCM16',
   'zero_endpoints':'pass','note_end_steps_pcm':smooth_ends,
   'peak_below_minus_10_dbfs':'pass','rms_within_0_5_db_of_v2':'pass',
   'dominant_above_450_hz':'pass','centroid_at_least_1_75x_v2':'pass',
   'energy_above_4khz_below_0_05_percent':'pass'})
 parts.append(np.zeros(round(.5*SR),dtype='<i2'))
 audition_pcm=np.concatenate(parts)
 audition=write_pcm(AUDITION_NAME,audition_pcm)
 shutil.copyfile(ROOT/AUDITION_NAME,ROOT/FRIENDLY_AUDITION_NAME)
 for entry in timeline:
  _,pcm=wavfile.read(ROOT/entry['file'])
  assert np.array_equal(audition_pcm[entry['start_frame']:entry['end_frame']],pcm)
 note_metrics={}
 for semitones in [14,16,18,21]:
  note=voice(source,semitones)
  f,p=signal.periodogram(note,SR,window='boxcar',nfft=262144,detrend=False)
  note_metrics[str(semitones)]={'dominant_hz':round(float(f[np.argmax(p)]),3),'duration_seconds':len(note)/SR}
 manifest={
  'family_version':3,'intended_application_master_gain':.18,
  'source':{'creator':'Kenney','pack':'Interface Sounds 1.0',
   'official_page':'https://kenney.nl/assets/interface-sounds',
   'licence':'CC0 1.0 Universal',
   'licence_url':'https://creativecommons.org/publicdomain/zero/1.0/',
   'archive_sha256':ZIP_SHA256,'archive_member':SOURCE_MEMBER,
   'original_sha256':SOURCE_SHA256,'licence_sha256':LICENCE_SHA256},
  'transforms':{
   'decode':'ffmpeg to 48000 Hz mono float32',
   'pitch':'SciPy polyphase resampling; denominator <= 10000; +14 to +21 semitones',
   'filters':'2nd-order high-pass 100 Hz; 4th-order low-pass 1900 Hz',
   'edges':'4 ms raised-sine attack; 18 ms raised-cosine release; zero endpoints',
   'mix':'Recipe note gains; overall v2-comparable RMS target; linear -10 dBFS peak cap',
   'export':'round to mono signed PCM16 WAV; no random dither',
   'audition':'Bit-identical final PCM concatenation; no gain adjustment or app gain'},
  'measurement_method':'Full-file periodogram; boxcar; 262144-point FFT; no detrend. Power-weighted centroid. Both v2 and v3 measured identically. RMS includes the fixed asset duration.',
  'verification':{'actual_listening':False,
   'note':'Technical signal and format verification only. No actual audio-listening tool was used. Subjective brightness, cuteness, and non-metallic quality remain unverified by listening.',
   'numpy':np.__version__,'scipy':scipy.__version__,
   'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]},
  'assets':assets,'audition':audition,'audition_timeline':timeline,
  'friendly_audition':{'file':FRIENDLY_AUDITION_NAME,'sha256':sha((ROOT/FRIENDLY_AUDITION_NAME).read_bytes())},
  'comparison_to_v2':comparisons,
  'individual_note_dominant_hz':note_metrics,
 }
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
 qa={'status':'pass','deterministic_render_verified':True,'actual_listening':False,'all_audition_segments_bit_identical_to_assets':True,
  'application_master_gain_unchanged':True,'site_files_changed':False,
  'checks':checks,'comparison_to_v2':comparisons}
 (ROOT/'QA-RESULTS.json').write_text(json.dumps(qa,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps({'assets':assets,'comparison_to_v2':comparisons,'audition':audition,'timeline':timeline},indent=2,ensure_ascii=False))

if __name__=='__main__':
 main()
