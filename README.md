# POKER LAB PWA v0.1

iPhoneホーム画面用の静的PWA。外部API、ログイン、課金不要。

## 公開（GitHub Pages）
1. GitHubで公開リポジトリ `poker-lab` を作成。
2. このフォルダの **中身**（index.html, app.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png）をリポジトリ直下にアップロード。
3. Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save。
4. 公開URL `https://ユーザー名.github.io/poker-lab/` をSafariで開く。
5. 共有 → ホーム画面に追加 → Webアプリとして開く → 追加。

GitHub Pagesの公開リポジトリは一般公開されます。ソースコードに個人情報や秘密を含めないでください。

## データ
回答履歴とハンド記録はlocalStorageに保存。端末・ブラウザ・ホーム画面アプリ間で自動同期されません。学習履歴の「JSONを書き出す」でバックアップできます。SafariからインストールしたPWAでは保存領域が異なることがあるため、アプリ側で新たに記録を始めてください。

## 制約
12問の学習用クイズ。169マスは簡略オープンレンジ（厳密なGTOではない）。SB/BBのレンジ、ソルバー頻度、AIハンド評価、ICMは未搭載。計算機はフルレイズ・一般的なポットオッズを想定。初回オンライン読み込み後にオフライン利用可能（環境依存）。
