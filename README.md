# sabanomisogi.github.io

TRPG サークル「鯖の禊」のサイト。素の HTML・CSS・JavaScript（ビルドなし）。GitHub Pages で公開する。

- `index.html` — ホーム（ヒーロー・頒布物・ジョーク広告・サークルについて）。初回だけ缶切りの演出が出る（`<head>` の小さなスクリプト）
- `books/` — 本の紹介（3冊）
- `bonus/` — 電子特典の受け取りページの一覧
- `rights/` — 権利表記（TRPGライツ事務局のガイドラインへのリンク）
- 電子特典の受け取りページ（パスワードで開く。本ごとに別のパスワード）。**URL は本に刷るので変えない**
  - `yadorimono/` — 『宿りもの』
  - `sabakan/` — 『鯖缶』
  - `kinou-ashita/` — 『昨日の貴女と明日の君へ』
- `404.html` — 見つからないページ。どの階層でも出るので、中のリンクは `/` から書く
- `site.v2.css` — 共通のスタイル（白・青・緑）。直したら `?v=` かファイル名の番号を上げる
- `site.v1.js` — 缶切りの絵、初回演出の飛ばし方、ジョーク広告の動き（お辞儀・くるくる）
- `unlock.v3.js` — 受け取りページで共通の、ブラウザの中で開く処理。確かめている間は缶切りが回る。直したらファイル名の番号を上げる
- `img/` — 表紙（360px・720px）とロゴ。元の画像は OneDrive の `デスクトップ\TRPG\` と、昨日の貴女と明日の君への PDF
- `ogp.png`（1200×630。SNS で共有したときのカード）
- アイコン「謝る鯖」（ロゴの「すいませんでした」の鯖が、汗をかいてお辞儀している）。元は `favicon.svg` で、ほかはこれをブラウザでその大きさに描いて書き出したもの。絵を直したら全部作り直す
  - `favicon.svg` — タブのアイコン（角丸）
  - `favicon.ico` — SVG を使えないブラウザや、`/favicon.ico` を見に来るサービス用（16・32・48px）
  - `apple-touch-icon.png`（180px）・`icon-192.png`・`icon-512.png` — スマホのホーム画面用。四角いまま（角は端末が丸める）。`icon-512.png` は X などのアイコンにも使える（丸く切り抜かれても欠けない）
  - `manifest.webmanifest` — Android の「ホーム画面に追加」で使う名前とアイコン

## 電子特典を置く・差し替える

元のファイルは `private/`（Git に入らない）に置き、暗号化したものだけを公開する。フォルダの名前は受け取りページと同じにする。

```
node tools/encrypt.mjs private/yadorimono yadorimono/files
node tools/encrypt.mjs private/sabakan sabakan/files
node tools/encrypt.mjs private/kinou-ashita kinou-ashita/files
```

- パスワードを聞かれる（環境変数 `BONUS_PASSWORD` でも渡せる）。その本に刷った（挟んだ）パスワードと同じものを使う
- 新しい本を足すときは、受け取りページのフォルダを写して文を直し、`files/.gitkeep` を置く。トップのカードからリンクする
- `private/<本>/labels.json` に `{ "ファイル名": "説明" }` を書くと、ページの一覧に説明が出る
- 出力先の古い `.bin` は消してから作り直す。差し替えのたびに全部を暗号化し直す
- 暗号: PBKDF2-SHA256（60万回）→ AES-256-GCM。照合の前にパスワードを NFKC・前後の空白除去・小文字にそろえる（全角や大文字で打っても通る）
- 1ファイル 100MB まで（GitHub の上限）
