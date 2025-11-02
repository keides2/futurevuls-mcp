# FutureVuls Teams Integration

Microsoft Teams と FutureVuls を連携させ、脆弱性情報を自動通知します。

## 🎯 特徴

- ✅ **IT部門の承認不要** - Power Automate の標準機能を使用
- ✅ **リッチな通知** - Adaptive Cards で見やすい表示
- ✅ **定期レポート** - 週次/日次で自動送信
- ✅ **複数組織対応** - groups.json で複数グループを管理
- ✅ **プロキシ対応** - 企業ネットワークでも使用可能

## 📋 必要なもの

- Microsoft 365 アカウント
- Teams のチャネル（通知先）
- FutureVuls API トークン
- Node.js 18.0 以上

## 🚀 セットアップ手順

### 1. Power Automate で Webhook を作成

#### 手順:

1. **Teams でチャネルを開く**
   - 通知を受け取りたいチャネルを選択

2. **Workflows を追加**
   - チャネル名の右の `...` → `ワークフロー` をクリック
   - 「ワークフローを参照」を選択

3. **Webhook トリガーを選択**
   - 検索で「webhook」と入力
   - 「Post to a channel when a webhook request is received」を選択
   - または「HTTP 要求の受信時」を選択

4. **設定**
   - ワークフロー名: `FutureVuls 通知`
   - チーム: 現在のチーム
   - チャネル: 現在のチャネル
   - 「追加」をクリック

5. **Webhook URL を取得**
   - 作成されたワークフローを開く
   - HTTP POST URL をコピー
   - 例: `https://prod-xx.xx.logic.azure.com:443/workflows/xxxxx`

### 2. プロジェクトのセットアップ

```powershell
# ディレクトリに移動
cd c:\Users\HP\mcp-servers\futurevuls-mcp\teams-integration

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
copy .env.template .env
```

### 3. 環境変数の設定

`.env` ファイルを編集:

```env
# Power Automate の Webhook URL を設定
TEAMS_WEBHOOK_URL=https://prod-xx.xx.logic.azure.com:443/workflows/xxxxx

# groups.json のパス
GROUPS_JSON_PATH=../groups.json

# 通知する脆弱性の最低レベル
MIN_SEVERITY=high

# プロキシ設定（必要な場合）
# HTTPS_PROXY=http://proxy.example.com:8080
```

### 4. 動作確認

```powershell
# テスト通知を送信
npm test

# 手動で通知を送信
npm start
```

## 📅 定期実行の設定

### Windows タスクスケジューラを使用

1. **タスクスケジューラを開く**
   - `Win + R` → `taskschd.msc`

2. **基本タスクの作成**
   - 名前: `FutureVuls Teams 通知`
   - トリガー: 毎週月曜日 9:00
   - 操作: プログラムの開始
   - プログラム: `C:\Program Files\nodejs\node.exe`
   - 引数: `c:\Users\HP\mcp-servers\futurevuls-mcp\teams-integration\teams-notifier.js`
   - 開始: `c:\Users\HP\mcp-servers\futurevuls-mcp\teams-integration`

### または scheduler.js を使用（常駐）

```powershell
# スケジューラーを起動
npm run schedule
```

## 🎨 通知のカスタマイズ

### 重要度フィルター

`.env` で設定:

```env
# critical, high のみ通知
MIN_SEVERITY=high

# すべての脆弱性を通知
MIN_SEVERITY=info
```

### 通知形式のカスタマイズ

`teams-notifier.js` の `createAdaptiveCard` 関数を編集して、
Adaptive Card のレイアウトをカスタマイズできます。

## 📊 通知例

Teams に以下のような通知が送信されます:

```
🔒 FutureVuls 脆弱性レポート
グループ: Production
検出日時: 2025/11/02 9:00:00

🔴 Critical: 5
🟠 High: 12
🟡 Medium: 23
🔵 Low: 45

主要な脆弱性 (上位10件)
━━━━━━━━━━━━━━━━━━━━━━
CVE-2024-XXXX
Apache HTTP Server vulnerability
Severity: Critical | Score: 9.8 | Server: web-01
...
```

## 🔧 トラブルシューティング

### Webhook URL が無効

- Power Automate で Webhook が有効か確認
- URL に余分なスペースや改行がないか確認

### 通知が届かない

- `.env` の設定を確認
- `DEBUG=true` でデバッグログを有効化
- プロキシ設定を確認

### API エラー

- `groups.json` のトークンが正しいか確認
- FutureVuls API の接続を確認

## 📚 参考リンク

- [Power Automate ドキュメント](https://learn.microsoft.com/ja-jp/power-automate/)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [FutureVuls API ドキュメント](https://vuls.biz/docs/ja/api.html)

## 📝 ライセンス

MIT License
