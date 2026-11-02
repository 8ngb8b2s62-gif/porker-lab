# POKER LAB v0.4 BETA

iPhone の Safari / GitHub Pages で動かす個人用ポーカートレーニングアプリのベータ版です。

## 更新方法（iPhoneのみ）
1. ZIPをiPhoneの「ファイル」に保存し、タップして展開します。
2. GitHubのリポジトリ `porker-lab` を開き、`Add file` → `Upload files` から、このフォルダ内の **10ファイル** をリポジトリの一番上にアップロードします（フォルダごとではなく中身）。
3. `Commit changes` を押し、GitHub Pages の反映後に `https://8ngb8b2s62-gif.github.io/porker-lab/` を Safari で開きます。
4. 古い画面が出たら Safari を再読み込みしてください。ホーム画面のアイコンを使っている場合は、Safariで更新を確認してから再度アプリを起動してください。

## 主な内容
- PLAY：2〜9人卓、MTT/CASH、状況対応型/固定スポット型、AIによるハンド進行、ショーダウン、サイドポット、ハンドレビュー。
- TRAIN：ポットオッズ練習。
- RANGES：169ハンドマトリクス、8種類のプレフロップ状況、参考分類、JSONインポート。
- ICM：2〜9人のICM賞金期待値計算、参考バブルファクター。
- STATS：直近のハンド・判断回数を端末内で保存。
- DATA：バックアップ・復元、レンジ取り込み。
- MTT：ハンド数制・時間制ブラインド、他卓の簡易人数推定。

## 重要な制約
- **GTOソルバーではありません。** 初期レンジとAIは学習用の近似モデルであり、ソルバー検証済みGTO頻度・EV Loss・厳密な戦略評価ではありません。
- 外部JSONの内容・計算精度は自動検証されません。
- 54人・100人などのMTTは他卓の**簡易推定**です。実際の多卓大会全体の精密シミュレーションではありません。
- 一部の高度な機能（網羅的なポストフロップ解析、FGS、完全適応型AIなど）は今後の開発対象です。
- データはブラウザ内のlocalStorageに保存されます。Safariのサイトデータ削除で消えるため、DATA画面から定期的にバックアップしてください。
- GitHub Pagesで公開するとURLを知る人がアプリを閲覧できます。完全なアクセス制限は別途必要です。

## ファイル構成
`index.html`, `styles.css`, `app.js`, `engine.js`, `ranges.js`, `service-worker.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `README.md`

`test_engine.mjs` は開発用のテストであり、公開ZIPには含めません。


## v0.4.1 iPhone layout fix
PLAY screen uses compact table and sticky action controls. Game settings are collapsed by default. Cache version incremented.


## v0.5 Quick Review
- Mobile PLAY actions are fixed to the viewport bottom.
- Instant feedback is enabled by default and appears immediately after every hero decision, including terminal decisions.
- Feedback presents action alternatives without invented solver frequencies or EV.
- Raise sizing presets, slider, direct BB entry and all-in remain available; legal min/max are enforced.
- On iPhone Safari, check safe-area and browser chrome; use Add to Home Screen for a more stable viewport.
