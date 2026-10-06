# 現在採用している音（version 3 sound family）

Kenney Interface Sounds / Audio/bong_001.oggを共通素材とした、短い4種類の効果音です。
ボタン: 0.080秒の軽い1音、果物を置く: 0.160秒の上向き2音、正解: 0.250秒の上昇3音、再挑戦: 0.090秒の高めの1音。
本人の「音が暗い」に合わせ、主な音高を約527〜789Hzへ上げ、下向きの音列をなくしました。音量は前版との差0.47dB以内です。
音源のピッチ・高域フィルタ・フェード・音量を調整し、アプリの再生ゲイン0.18を維持しています。ページを開くたび初期ON表示ですが、最初の本人操作から再生を開始します。

元pluck_001（本人: 琴みたい）とdrop_002（本人: かわいくない）は、現在の音選択には使いません。
既存の旧drop_002ファイルは開いたままの旧版との互換性のため残しています。

公式: https://kenney.nl/assets/interface-sounds
CC0: https://creativecommons.org/publicdomain/zero/1.0/
公式ページと配布ZIP同梱License.txtから、無料の加工・アプリ組込み・公開・商用利用・再配布が可能なことを確認しました。

現行の出典・加工・SHA-256: bright-family/PROVENANCE.txt と bright-family/manifest.json。
再生成: bright-family/build_sounds.py。元OGGとライセンスも同フォルダへ保存。

実際の聴感・iPhoneでの聴感確認は未実施です。波形・形式・ピーク・再生成一致は検証済み。
旧版のdrop_002加工記録は上位provenance.json/README.txtに履歴として保持しています。
