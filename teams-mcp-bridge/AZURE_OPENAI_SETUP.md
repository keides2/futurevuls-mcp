# Azure OpenAI セットアップガイド

FutureVuls Teams MCP Bridge で Azure OpenAI Service を使用するためのセットアップ手順

## 📋 前提条件

- Azureサブスクリプション
- Azure OpenAI Service のアクセス権
- Node.js 18.0+

## 🔧 Azure OpenAI Service のセットアップ

### 1. Azure Portal でリソースを作成

```powershell
# Azure CLI でログイン
az login

# リソースグループ作成
az group create `
  --name rg-futurevuls-ai `
  --location japaneast

# Azure OpenAI リソース作成
az cognitiveservices account create `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --kind OpenAI `
  --sku S0 `
  --location japaneast `
  --yes
```

### 2. モデルのデプロイ

Azure Portal から:

1. **Azure OpenAI リソース** を開く
2. **モデルのデプロイ** → **新しいデプロイの作成**
3. 設定:
   - モデル: `gpt-4o` (推奨) または `gpt-4`
   - デプロイ名: `gpt-4o` (この名前を .env で使用)
   - バージョン: 最新
   - デプロイタイプ: Standard

または Azure CLI で:

```powershell
# GPT-4o のデプロイ
az cognitiveservices account deployment create `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --deployment-name gpt-4o `
  --model-name gpt-4o `
  --model-version "2024-08-06" `
  --model-format OpenAI `
  --sku-capacity 10 `
  --sku-name "Standard"
```

### 3. キーとエンドポイントを取得

Azure Portal から:
1. Azure OpenAI リソース → **キーとエンドポイント**
2. コピー:
   - **エンドポイント**: `https://futurevuls-openai.openai.azure.com/`
   - **キー1** または **キー2**

または Azure CLI で:

```powershell
# エンドポイント取得
az cognitiveservices account show `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --query "properties.endpoint" -o tsv

# キー取得
az cognitiveservices account keys list `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --query "key1" -o tsv
```

## 🔐 Bridge Server の設定

### 1. .env ファイルを作成

```powershell
cd C:\Users\HP\mcp-servers\futurevuls-mcp\teams-mcp-bridge
Copy-Item .env.template .env
```

### 2. .env を編集

```bash
# Azure OpenAI Service 設定
AZURE_OPENAI_ENDPOINT=https://futurevuls-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-key-from-azure-portal
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview

# サーバー設定
PORT=3000
MCP_SERVER_PATH=../futurevuls-mcp.js

# モデル設定
MAX_TOKENS=2048
TEMPERATURE=0.1

# デバッグモード
DEBUG=false

# groups.json のパス
GROUPS_JSON_PATH=../groups.json
```

### 3. 依存パッケージをインストール

```powershell
npm install
```

### 4. サーバー起動

```powershell
npm start
```

成功すると以下のように表示されます:

```
✅ Azure OpenAI クライアント初期化完了
🚀 MCPサーバーを起動中: ../futurevuls-mcp.js
✅ MCPサーバー初期化完了
============================================================
🚀 FutureVuls Teams MCP Bridge v2.0 起動完了!
============================================================
📡 サーバー: http://localhost:3000
🤖 AI エンジン: Azure OpenAI (gpt-4o)
🔧 MCP Server: ../futurevuls-mcp.js
============================================================
```

## 🧪 動作確認

### ヘルスチェック

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/"
```

期待される応答:

```json
{
  "status": "ok",
  "service": "FutureVuls Teams MCP Bridge v2.0",
  "features": ["Azure OpenAI Integration", "Natural Language Understanding"],
  "azureOpenAI": {
    "configured": true,
    "deployment": "gpt-4o"
  },
  "version": "2.0.0",
  "timestamp": "2025-11-02T..."
}
```

### 自然言語クエリのテスト

```powershell
# グループ一覧
Invoke-RestMethod -Uri "http://localhost:3000/api/query" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"query": "グループ一覧を見せて"}'

# CVE検索
Invoke-RestMethod -Uri "http://localhost:3000/api/query" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"query": "CVE-2025- で始まる脆弱性を教えて", "group": "ERMS"}'

# 重大な脆弱性
Invoke-RestMethod -Uri "http://localhost:3000/api/query" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"query": "重大な脆弱性はありますか？", "group": "ERMS"}'
```

## 💰 コスト管理

### GPT-4o 料金（2024年11月時点）

- **Input**: $2.50 / 1M tokens
- **Output**: $10.00 / 1M tokens

### 想定コスト

1回の質問あたり:
- Input: ~1,000 tokens (ツール定義 + 質問) = **$0.0025**
- Output: ~200 tokens (JSON応答) = **$0.002**
- **合計: 約 $0.0045 / 回**

月間利用（100回/日 × 30日 = 3,000回）:
- **約 $13.50 / 月**

### コスト監視

Azure Portal で設定:

1. **コスト管理 + 請求** → **予算**
2. 予算を作成:
   - スコープ: Azure OpenAI リソース
   - 金額: $50/月
   - アラート: 80%, 100%

### 使用量の確認

```powershell
# 過去30日の使用量
az monitor metrics list `
  --resource /subscriptions/{subscription-id}/resourceGroups/rg-futurevuls-ai/providers/Microsoft.CognitiveServices/accounts/futurevuls-openai `
  --metric "TotalTokens" `
  --start-time (Get-Date).AddDays(-30) `
  --interval PT1H
```

## 🔒 セキュリティ

### 1. キーローテーション

```powershell
# キー2を再生成
az cognitiveservices account keys regenerate `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --key-name key2
```

推奨スケジュール: 90日ごと

### 2. ネットワーク制限

特定IPからのみアクセス許可:

```powershell
# ファイアウォール設定
az cognitiveservices account network-rule add `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai `
  --ip-address "203.0.113.0/24"
```

### 3. Managed Identity（推奨）

APIキーの代わりにManaged Identityを使用:

```powershell
# システム割り当てマネージド ID を有効化
az webapp identity assign `
  --name futurevuls-bridge-app `
  --resource-group rg-futurevuls-ai

# Azure OpenAI にロール割り当て
az role assignment create `
  --assignee <webapp-principal-id> `
  --role "Cognitive Services OpenAI User" `
  --scope /subscriptions/{subscription-id}/resourceGroups/rg-futurevuls-ai/providers/Microsoft.CognitiveServices/accounts/futurevuls-openai
```

## 🚀 本番環境への デプロイ

### Azure App Service へのデプロイ

```powershell
# App Service 作成
az webapp create `
  --name futurevuls-bridge `
  --resource-group rg-futurevuls-ai `
  --plan futurevuls-plan `
  --runtime "NODE:18-lts"

# 環境変数設定
az webapp config appsettings set `
  --name futurevuls-bridge `
  --resource-group rg-futurevuls-ai `
  --settings `
    AZURE_OPENAI_ENDPOINT="https://futurevuls-openai.openai.azure.com/" `
    AZURE_OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://...)" `
    AZURE_OPENAI_DEPLOYMENT="gpt-4o" `
    AZURE_OPENAI_API_VERSION="2024-08-01-preview" `
    MCP_SERVER_PATH="./futurevuls-mcp.js" `
    PORT="8080"

# デプロイ
cd C:\Users\HP\mcp-servers\futurevuls-mcp\teams-mcp-bridge
Compress-Archive -Path * -DestinationPath deploy.zip
az webapp deployment source config-zip `
  --name futurevuls-bridge `
  --resource-group rg-futurevuls-ai `
  --src deploy.zip
```

## 📊 モニタリング

### Application Insights 統合

```powershell
# Application Insights 作成
az monitor app-insights component create `
  --app futurevuls-bridge-insights `
  --location japaneast `
  --resource-group rg-futurevuls-ai `
  --application-type Node.JS

# App Service に接続
az webapp config appsettings set `
  --name futurevuls-bridge `
  --resource-group rg-futurevuls-ai `
  --settings `
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=..."
```

### ログの確認

```powershell
# リアルタイムログ
az webapp log tail `
  --name futurevuls-bridge `
  --resource-group rg-futurevuls-ai

# Application Insights でクエリ
# Azure Portal → Application Insights → ログ
# Kusto Query:
# traces | where message contains "Azure OpenAI"
```

## 🔧 トラブルシューティング

### Azure OpenAI が設定されていない

```
⚠️  警告: Azure OpenAI が設定されていません
```

→ `.env` の設定を確認:
- `AZURE_OPENAI_ENDPOINT` が正しいか
- `AZURE_OPENAI_API_KEY` が有効か
- エンドポイントの末尾に `/` があるか

### デプロイメント名が見つからない

```
❌ Azure OpenAI エラー: The API deployment for this resource does not exist
```

→ デプロイメント名を確認:

```powershell
az cognitiveservices account deployment list `
  --name futurevuls-openai `
  --resource-group rg-futurevuls-ai
```

### クォータ制限

```
❌ Error: Rate limit exceeded
```

→ クォータを確認・増加:

Azure Portal → Azure OpenAI → クォータ → 増加をリクエスト

## 📚 参考リンク

- [Azure OpenAI Service ドキュメント](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/)
- [料金](https://azure.microsoft.com/ja-jp/pricing/details/cognitive-services/openai-service/)
- [クォータと制限](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/quotas-limits)
- [Azure SDK for JavaScript](https://learn.microsoft.com/ja-jp/javascript/api/overview/azure/openai-readme)

---

**次のステップ**: [Power Automate 統合ガイド](./POWER_AUTOMATE_SETUP.md)
