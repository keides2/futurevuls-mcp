# FutureVuls Teams MCP Bridge v2.0

Microsoft Teams統合 + Claude AI による自然言語理解を実装したMCPブリッジサーバー

## 🌟 新機能 (v2.0)

- ✨ **Claude AI統合**: 自然言語を理解して適切なMCPツールを自動選択
- 🧠 **インテリジェントなパラメータ抽出**: CVE ID、日付範囲、重要度などを自動認識
- 💬 **柔軟な質問対応**: コードを変更せずに様々な質問パターンに対応
- 🎯 **コンテキスト理解**: グループ指定、フィルタ条件などを文脈から判断

## 📋 前提条件

1. **Node.js 18.0+**
2. **Claude API キー** (https://console.anthropic.com/ から取得)
3. **FutureVuls アカウント** と API トークン
4. **Microsoft 365 組織アカウント** (Power Automate用)

## 🚀 セットアップ

### 1. 依存パッケージのインストール

```powershell
cd C:\Users\HP\mcp-servers\futurevuls-mcp\teams-mcp-bridge
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成:

```bash
# Claude API キー（必須）
CLAUDE_API_KEY=sk-ant-api03-xxxxx

# Claude モデル設定
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=2048

# サーバー設定
PORT=3000
MCP_SERVER_PATH=../futurevuls-mcp.js

# デバッグモード
DEBUG=false

# groups.json のパス
GROUPS_JSON_PATH=../groups.json
```

### 3. サーバー起動

```powershell
npm start
# または開発モード（自動再起動）
npm run dev
```

## 💬 使用例

### 基本的な質問

```powershell
# グループ一覧
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "グループ一覧を見せて"}'

# 脆弱性検索
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "脆弱性を教えて", "group": "ERMS"}'

# 重大な脆弱性
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "重大な脆弱性はありますか？", "group": "ERMS"}'
```

### CVE検索

```powershell
# 2025年のCVE
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "CVE-2025- で始まる脆弱性を教えて", "group": "ERMS"}'

# 特定のCVE詳細
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "CVE-2024-12345 の詳細を教えて", "group": "ERMS"}'
```

### 高度な質問

```powershell
# CVSS 9.0以上
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "CVSS スコア 9.0 以上の脆弱性を探して", "group": "ERMS"}'

# サーバー一覧
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "サーバーの一覧を見せて", "group": "ERMS"}'

# 週次レポート
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "今週のレポートを作成して", "group": "ERMS"}'
```

## 🔧 Power Automate統合

### フロー作成手順

1. **Power Automate**にアクセス (https://make.powerautomate.com/)

2. **新しいフロー作成**
   - トリガー: 「When a new message is posted in Teams」
   - フィルター: メンションまたは特定のキーワード

3. **HTTP アクション追加**
   ```
   URI: http://<サーバーアドレス>:3000/api/query
   Method: POST
   Headers:
     Content-Type: application/json; charset=utf-8
   Body:
   {
     "query": "@{triggerBody()?['text']}",
     "group": "ERMS"
   }
   ```

4. **Teams アクション追加**
   - 「Post card in a chat or channel」
   - Card: `@{body('HTTP')}` (HTTP応答をそのまま使用)

### グループの動的指定

メッセージから自動抽出:
```
{
  "query": "@{replace(triggerBody()?['text'], '@FutureVuls ', '')}",
  "group": "@{if(contains(triggerBody()?['text'], 'ERMS'), 'ERMS', if(contains(triggerBody()?['text'], 'DBIPS'), 'DBIPS', null))}"
}
```

## 🧪 テスト

### ローカルテスト

```powershell
# ヘルスチェック
Invoke-RestMethod -Uri "http://localhost:3000/"

# 簡単な質問
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "ヘルスチェック"}'

# グループ指定
Invoke-RestMethod -Uri "http://localhost:3000/api/query" -Method Post -ContentType "application/json; charset=utf-8" -Body '{"query": "脆弱性は何件ありますか？", "group": "ERMS"}'
```

### デバッグモード

`.env` で `DEBUG=true` に設定すると詳細ログが出力されます:

```bash
DEBUG=true
```

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────┐
│  Microsoft Teams                        │
│  "CVE-2025- で始まる脆弱性を教えて"      │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Power Automate                         │
│  - トリガー: Teams メッセージ            │
│  - POST /api/query                      │
└────────────┬────────────────────────────┘
             │ HTTP POST
             ▼
┌─────────────────────────────────────────┐
│  Bridge Server v2.0 (Node.js)           │
│  ┌───────────────────────────────┐      │
│  │ Claude API                    │      │
│  │ - 自然言語理解                 │      │
│  │ - ツール選択                   │      │
│  │ - パラメータ抽出               │      │
│  └────────┬──────────────────────┘      │
│           ▼                             │
│  ┌───────────────────────────────┐      │
│  │ MCP Client (stdio)            │      │
│  │ futurevuls_get_cves 呼び出し  │      │
│  └───────────────────────────────┘      │
└────────────┬────────────────────────────┘
             │ stdio (JSON-RPC)
             ▼
┌─────────────────────────────────────────┐
│  MCP Server (futurevuls-mcp.js)         │
│  - FutureVuls REST API 呼び出し         │
│  - データ整形                            │
└─────────────────────────────────────────┘
```

## 🔐 セキュリティ

### API キー保護

本番環境では環境変数またはシークレット管理サービスを使用:

```bash
# Azure Key Vault
CLAUDE_API_KEY=@Microsoft.KeyVault(SecretUri=https://xxx.vault.azure.net/secrets/claude-api-key)
```

### 認証トークン（オプション）

`.env` に追加:
```bash
API_KEY=your-secret-token
```

Bridge Server側で検証:
```javascript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

## 📊 コスト見積もり

### Claude API 料金

Claude 3.5 Sonnet (2024-10-22):
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

1回の質問あたり:
- Input: ~1,000 tokens (ツール定義 + 質問) = $0.003
- Output: ~200 tokens (JSON応答) = $0.003
- **合計: 約 $0.006 / 回**

月間利用想定:
- 100 回/日 × 30日 = 3,000回
- **約 $18 / 月**

### コスト最適化

1. **キャッシング**: 同じ質問の結果をキャッシュ
2. **モデル選択**: 簡単な質問には Claude 3.5 Haiku を使用
3. **バッチ処理**: 複数の質問をまとめて処理

## 🚢 デプロイ

### Azure App Service

```powershell
# リソースグループ作成
az group create --name rg-futurevuls-bridge --location japaneast

# App Service Plan 作成
az appservice plan create --name plan-futurevuls --resource-group rg-futurevuls-bridge --sku B1 --is-linux

# Web App 作成
az webapp create --name futurevuls-bridge --resource-group rg-futurevuls-bridge --plan plan-futurevuls --runtime "NODE:18-lts"

# 環境変数設定
az webapp config appsettings set --name futurevuls-bridge --resource-group rg-futurevuls-bridge --settings CLAUDE_API_KEY="sk-ant-xxx"

# デプロイ
cd C:\Users\HP\mcp-servers\futurevuls-mcp\teams-mcp-bridge
zip -r deploy.zip .
az webapp deployment source config-zip --name futurevuls-bridge --resource-group rg-futurevuls-bridge --src deploy.zip
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "bridge-server-v2.js"]
```

```powershell
docker build -t futurevuls-bridge:v2 .
docker run -p 3000:3000 --env-file .env futurevuls-bridge:v2
```

## 📝 トラブルシューティング

### Claude API エラー

```
❌ Claude API エラー: 401 Unauthorized
```

→ `.env` の `CLAUDE_API_KEY` を確認

### MCP Server 起動失敗

```
❌ MCPサーバーを起動できません
```

→ `MCP_SERVER_PATH` のパスを確認

### UTF-8 文字化け

→ Power Automate の HTTP アクションで `charset=utf-8` を指定

## 🆕 v1.0 からの移行

1. `package.json` を更新
2. `.env` に `CLAUDE_API_KEY` を追加
3. `bridge-server-v2.js` を使用
4. `npm install` で依存関係を更新

## 📞 サポート

Issues: https://github.com/keides2/futurevuls-mcp/issues

---

**FutureVuls Teams MCP Bridge v2.0** - Powered by Claude AI 🤖
