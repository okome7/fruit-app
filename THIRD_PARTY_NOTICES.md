# Third-party notices

## Active sound family: Kenney — Interface Sounds 1.0

The active button, fruit-placement, success and gentle-retry sounds are derived
from `Audio/bong_001.ogg` in Kenney's **Interface Sounds** pack.

- `public/audio/button-soft-pon-v3.wav` (0.080 s)
- `public/audio/fruit-soft-koron-v3.wav` (0.160 s)
- `public/audio/success-soft-v3.wav` (0.250 s)
- `public/audio/retry-soft-v3.wav` (0.090 s)

The original was decoded, pitch-shifted, filtered and given soft fades; short
note combinations distinguish the actions. All files are mono 48 kHz PCM16 WAV,
with peaks at or below -10 dBFS. Exact transformations and hashes are recorded in
`licenses/kenney-interface-sounds/bright-family/PROVENANCE.txt` and `manifest.json`.
The app playback gain remains 0.18. Each fresh page starts with sound ON displayed. Only raw bytes are prefetched;
context creation, playback-session selection and actual playback wait for the
user's first interaction. OFF immediately mutes and cancels pending sounds.

The previous `button-bubble.wav` from `Audio/drop_002.ogg` is retained solely for
backward compatibility with an already-open older app; the current app does not
select it. Neither drop_002 nor the previously rejected pluck_001 is used in the
active sound family.

- Creator/distributor: Kenney, https://kenney.nl/
- Official asset page: https://kenney.nl/assets/interface-sounds
- License: **Creative Commons Zero (CC0) 1.0 Universal**
- License summary: https://creativecommons.org/publicdomain/zero/1.0/
- Full legal text: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en
- Original pack notice: `licenses/kenney-interface-sounds/License.txt`
- Full CC0 text: `licenses/kenney-interface-sounds/CC0-1.0.txt`
- Source file, provenance, conversion and checks: `licenses/kenney-interface-sounds/README.md`

The asset page and the exact download's bundled license both identify this pack
as CC0. Its bundled license explicitly permits personal, educational and
commercial use; attribution is optional. CC0 permits copying, adapting,
distributing and publicly performing the sound, including commercial use,
without a fee or individual permission. This supports embedding the converted
sound in a publicly available game. This credit is supplied voluntarily.

The sound and associated rights are supplied without warranties. CC0 does not
grant trademark or patent rights or imply Kenney endorses this app; rights of
other people are not automatically cleared. See the full legal text above.
This review applies to these sounds only, not other app artwork or dependencies.

## 日本語の確認メモ

公式素材ページと、同じ公式ZIPに入っている License.txt の両方で CC0 を確認しました。
無料で個人・教育・商用プロジェクトに利用でき、変換・組込み・再配布・公開ができます。
クレジット表記は必須ではありませんが、出典とライセンスを任意で残しています。
素材は無保証で、商標・特許の権利や他者の権利をすべて保証するものではありません。
この確認は追加した効果音に限ります。

公式ページ・ライセンス再確認日: 2026-10-05 UTC。
