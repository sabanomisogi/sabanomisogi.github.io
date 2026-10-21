# sabanomisogi.github.io

TRPG サークル「鯖の禊」のサイト。素の HTML・CSS・JavaScript（ビルドなし）。GitHub Pages で公開する。

- `index.html` — トップ（頒布物・連絡先）
- `yadorimono/` — 『宿りもの』電子特典の受け取りページ（パスワードで開く）
- `site.v1.css` — 共通のスタイル。直したら `?v=` かファイル名の番号を上げる

## 電子特典を置く・差し替える

元のファイルは `private/`（Git に入らない）に置き、暗号化したものだけを公開する。

```
node tools/encrypt.mjs private/yadorimono yadorimono/files
```

- パスワードを聞かれる（環境変数 `BONUS_PASSWORD` でも渡せる）。本に刷ったパスワードと同じものを使う
- `private/yadorimono/labels.json` に `{ "ファイル名": "説明" }` を書くと、ページの一覧に説明が出る
- 出力先の古い `.bin` は消してから作り直す。差し替えのたびに全部を暗号化し直す
- 暗号: PBKDF2-SHA256（60万回）→ AES-256-GCM。照合の前にパスワードを NFKC・前後の空白除去・小文字にそろえる（全角や大文字で打っても通る）
- 1ファイル 100MB まで（GitHub の上限）
