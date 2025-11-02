# Teams MCP Bridge

Microsoft Teams/Power Automate と FutureVuls MCP を連携させる Bridge サーバー

## 🎯 できること

Teams から自然言語で質問すると、MCPが解釈して FutureVuls のデータを返します:

### 📝 質問例

| Teams での質問 | MCP の動作 |
|---------------|-----------|
| "Critical な脆弱性を教えて" | `get_cves` を実行 |
| "今週のタスクは?" | `get_tasks` を実行 |
| "サーバー一覧を見せて" | `get_servers` を実行 |
| "週次レポートを出して" | `get_weekly_report` を実行 |
| "使い方を教えて" | ヘルプを表示 |

## 🏗️ アーキテクチャ

```
Teams ユーザー
    ↓ 自然言語クエリ
Power Automate
    ↓ HTTP POST
Bridge Server (このサーバー)
    ↓ stdio
FutureVuls MCP
    ↓ API
FutureVuls
```

## 🚀 セットアップ

### 1. 依存関係のインストール

```powershell
cd c:\Users\HP\mcp-servers\futurevuls-mcp\teams-mcp-bridge
npm install
```

### 2. 環境変数の設定

```powershell
copy .env.template .env
notepad .env
```

### 3. Bridge サーバーの起動

```powershell
npm start
```

サーバーが起動したら:
```
🚀 Teams MCP Bridge を起動しています...
✅ MCP サーバーと接続しました
📡 Bridge サーバーが起動しました
   URL: http://localhost:3000
   エンドポイント: POST /api/query
```

## 🔧 Power Automate の設定

### ステップ1: HTTP トリガーのフローを作成

1. Power Automate で新しいフロー作成
2. トリガー: **「HTTP 要求の受信時」**
3. 要求本文の JSON スキーマ:
```json
{
    "type": "object",
    "properties": {
        "query": {
            "type": "string"
        },
        "group": {
            "type": "string"
        }
    }
}
```

### ステップ2: Bridge サーバーを呼び出す

1. アクション追加: **「HTTP」**
2. 設定:
   - 方法: `POST`
   - URI: `http://localhost:3000/api/query`
   - ヘッダー: `Content-Type: application/json`
   - 本文: 
   ```json
   {
       "query": "@{triggerBody()?['text']}",
       "group": "ERMS"
   }
   ```

### ステップ3: Teams にポスト

1. アクション追加: **「Teams - チャネルにメッセージを投稿する」**
2. 設定:
   - メッセージ: `@{body('HTTP')}`

## 💡 使用例

### Teams から質問

```
@FutureVuls Critical な脆弱性を教えて
```

### Bridge が処理

```json
POST /api/query
{
    "query": "Critical な脆弱性を教えて",
    "group": "ERMS"
}
```

### MCP が実行

```javascript
mcpClient.callTool('get_cves', { 
    page: 1, 
    limit: 20 
})
```

### Teams に返答

```
🔒 FutureVuls レポート
クエリ: Critical な脆弱性を教えて
実行日時: 2025/11/02 15:30:00

[Adaptive Card でリッチな表示]
- CVE-2024-XXXX (Critical)
- CVE-2024-YYYY (Critical)
...
```

## 🎨 カスタマイズ

### クエリパターンの追加

`bridge-server.js` の `parseQuery` 関数を編集:

```javascript
function parseQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  // 新しいパターンを追加
  if (lowerQuery.includes('先週の')) {
    return { 
      tool: 'get_weekly_report', 
      args: {} 
    };
  }
  
  // ... 既存のパターン
}
```

## 🔒 セキュリティ

本番環境では:

1. **HTTPS を使用**
2. **APIキー認証を追加**
3. **レート制限を実装**
4. **Azure App Service にデプロイ**

## 📝 トラブルシューティング

### MCP サーバーに接続できない

```powershell
# MCP_SERVER_PATH を確認
$env:DEBUG="true"
npm start
```

### Power Automate から接続できない

- Bridge サーバーが起動しているか確認
- ファイアウォール設定を確認
- localhost の代わりに IP アドレスを使用

## 🎉 次のステップ

出社したら:

1. ✅ Bridge サーバーをテスト
2. ✅ Power Automate フローを作成
3. ✅ Teams チャネルで試す
4. 🚀 本番デプロイ (Azure App Service)

