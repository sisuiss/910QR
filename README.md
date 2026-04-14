# 店舗クーポン用ワンタイムQRコード認証システム

## 概要

- **構成**: GitHub Pages（HTML/UI） + Google Apps Script（APIのみ） + Google Sheets（データ管理）
- **特徴**: iframeなし、google.script.runなし、fetch()でシンプルに連携

---

## システム構成

```
ユーザー  → index.html (GitHub Pages) → fetch() → GAS API → Sheets
スタッフ  → staff.html (GitHub Pages) → fetch() → GAS API → Sheets
```

| ファイル | 場所 | 役割 |
|---|---|---|
| `index.html` | GitHub Pages | ユーザー向けクーポン発行・QR表示 |
| `staff.html` | GitHub Pages | スタッフ向け認証画面 |
| `Code.gs` | GAS | APIのみ（スプレッドシート操作） |
| `parent.html` | GitHub Pages | 不使用（旧バージョンの名残） |

---

## GAS API エンドポイント

全て GET リクエスト。レスポンスは JSON。

| パラメータ | 用途 |
|---|---|
| `?action=issue&bid=xxx` | トークン発行 |
| `?action=status&bid=xxx` | クーポン状態確認 |
| `?action=check&token=xxx` | トークン状態確認（ポーリング用） |
| `?action=auth&token=xxx&password=xxx` | スタッフ認証 |

---

## Google Sheets（Logsシート）

| A: 発行日時 | B: ブラウザID | C: トークン | D: ステータス | E: 使用日時 | F: 備考 |
|---|---|---|---|---|---|

---

## ユーザーフロー

1. `index.html` にアクセス
2. 自動でクーポン発行（`action=issue`）
3. QRコードが表示される → スタッフに提示

## スタッフフロー

1. QRをスキャン → `staff.html?token=xxx` に遷移
2. パスワード入力 → `action=auth` で照合
3. 承認成功 → ユーザー画面がポーリングで「使用済み」に更新

---

## セットアップ

→ [QUICKSTART.md](QUICKSTART.md) を参照

---

## スタッフパスワード

```
910
```

Code.gs の `STAFF_PASSWORD` で変更可能。
