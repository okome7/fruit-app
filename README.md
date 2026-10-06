# くだものやさん・指であそぶアプリ

確認済みの試作 v17 と同じアプリケーションコード・画像・音声をまとめた版です。
アプリ本体の同期対象は src/、public/、index.html、package.json、package-lock.json、vite.config.js です。
試作のホスティング設定とアクセス制限は含めていません。アプリ自体に認証機能はありません。
実行環境は Node.js 24.x を推奨します。依存関係は package-lock.json を使って npm ci で再現してください。

- Pointer Eventsによる果物だけの指追従プレビューとレジdrop確定
- safe-area / 100dvh。横画面は背景とパーツを同じ座標系で画面いっぱいに表示し、長い説明文だけ少し小さく調整。縦画面は874:402の全体を幅に合わせて表示
- 対応ブラウザのみ全画面ボタンを表示。ブラウザUIの非表示は端末・ブラウザ対応に依存
- ヘルプ中のタイマー一時停止と残り時間保持
- 画像は見た目を保った軽量化＋現在画面の準備後に次画面を1枚ずつ低優先度で先読み（Save-Data/2Gでは先読みなし）
- Kenney CC0 bong_001由来の短い音4種類（ボタン/果物/正解/再挑戦）、音ON/OFFと単一音声再生

音の出典と加工条件: THIRD_PARTY_NOTICES.md / licenses/

ローカル確認: npm ci / npm run test / npm run build / npm run dev

自動検証はNodeと模擬DOMです。実機の音色、タッチ感、PWA/ノッチ表示は本人による確認待ちです。
任意のWebMCP機能はfeature detection付き。対応ブラウザーでのWebMCP実検証は未実施です。

音はページを開くたびON表示で開始します。開いただけでは再生せず、最初のタップなど本人操作の直下で、対応ブラウザの標準Audio Session APIをplaybackに設定し、AudioContextを再開します。WebKitはiOS17以降のマナーモード中のWeb Audio再生にこの方式を案内しています。未対応環境では通常のブラウザ制約を保持します。無音ループやOS設定変更は行いません。音ON中は別アプリの音楽を中断する場合があります。
公式説明: https://bugs.webkit.org/show_bug.cgi?id=237322#c6
APIの意味と制限: https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type
実機iPhoneのマナースイッチ/音量/出力先での鳴動・主観的な音色は未検証です。
