# sabanomisogi.github.io

TRPG サークル「鯖の禊」のサイト。素の HTML・CSS・JavaScript（ビルドなし）。GitHub Pages で公開する。

- `index.html` — トップ（頒布物・連絡先）
- 電子特典の受け取りページ（パスワードで開く。本ごとに別のパスワード）
  - `yadorimono/` — 『宿りもの』
  - `sabakan/` — 『鯖缶』
  - `kinou-ashita/` — 『昨日の貴女と明日の君へ』
- `unlock.v2.js` — 受け取りページで共通の、ブラウザの中で開く処理。直したらファイル名の番号を上げる
- `site.v1.css` — 共通のスタイル。直したら `?v=` かファイル名の番号を上げる

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
