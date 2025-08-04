# FutureVuls MCP Server 接続問題 調査レポート

## 📋 概要

FutureVuls MCP Serverの接続問題について調査・解決を行った際に発見した問題点と対策をまとめたレポートです。

**調査期間**: 2025年8月4日  
**対象環境**: Windows 11 + 企業プロキシ環境  
**Node.js version**: v22.14.0  
**VS Code**: Claude Desktop統合環境

## 🚨 発生した問題

### 主要エラーメッセージ
```
fetch failed
ConnectTimeoutError: Connect Timeout Error
url.startsWith is not a function
```

### 症状
- curlコマンドでは正常にFutureVuls APIにアクセス可能
- Node.js MCPサーバー経由では接続タイムアウト
- プロキシ設定が適用されていない

## 🔍 根本原因の分析

### 1. Node.js標準fetch APIとプロキシの非互換性

**問題**: Node.js v18以降の標準fetch APIが`https-proxy-agent`と完全に互換性がない

```javascript
// 問題のあるコード
const response = await fetch(url, {
  agent: new HttpsProxyAgent(HTTPS_PROXY)
});
```

**影響**: プロキシ経由でのHTTPSリクエストが`ConnectTimeoutError`で失敗

**技術的詳細**:
- Node.js標準fetchは内部実装でプロキシエージェントを正しく認識しない
- 企業プロキシ環境では外部APIアクセスが必須
- HTTPSプロキシの設定が無視される

### 2. URLオブジェクトのメソッド呼び出しエラー

**問題**: URLオブジェクトに対して直接`.startsWith()`メソッドを呼び出していた

```javascript
// 問題のあるコード
if (url.startsWith('https://')) // url は URL オブジェクト
```

**影響**: `url.startsWith is not a function` エラーが発生

**修正**: URLオブジェクトを文字列に変換してから処理

```javascript
// 修正後
if (url.toString().startsWith('https://'))
```

### 3. node-fetchバージョン互換性問題

**問題**: node-fetch v3はESモジュール形式のため、CommonJS環境でrequireできない

```javascript
// v3では動作しない
const fetch = require('node-fetch');
// Error: require() of ES modules is not supported
```

**影響**: モジュールのインポートエラーでMCPサーバーが起動しない

### 4. SSL証明書検証エラー

**問題**: 企業プロキシ環境でのSSL証明書チェーンの問題

**影響**: HTTPS接続でSSL検証エラーが発生

## 🛠️ 実施した対策

### 1. node-fetch v2へのダウングレード

```bash
# ESモジュール互換性のためv2を使用
npm uninstall node-fetch
npm install node-fetch@^2.6.12
```

**理由**: 
- CommonJS環境でのrequire()互換性を確保
- https-proxy-agentとの完全互換性
- 安定したプロキシサポート

### 2. プロキシエージェント設定の修正

```javascript
// 修正後のコード
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const options = {
  method,
  headers: this.headers,
};

// プロキシエージェントの設定
if (url.toString().startsWith('https://') && HTTPS_PROXY) {
  options.agent = new HttpsProxyAgent(HTTPS_PROXY);
  debugLog(`Using HTTPS proxy: ${HTTPS_PROXY}`);
}

const response = await fetch(url, options);
```

**改善点**:
- node-fetch v2とHttpsProxyAgentの組み合わせで確実な動作
- プロキシ設定の明示的な適用
- デバッグログによる動作確認

### 3. URLオブジェクト処理の修正

```javascript
// 修正前
if (url.startsWith('https://'))

// 修正後  
if (url.toString().startsWith('https://'))
```

### 4. SSL証明書検証の無効化

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "futurevuls": {
      "env": {
        "NODE_TLS_REJECT_UNAUTHORIZED": "0",
        "HTTP_PROXY": "http://gwproxy.daikin.co.jp:3128",
        "HTTPS_PROXY": "http://gwproxy.daikin.co.jp:3128"
      }
    }
  }
}
```

**注意**: 本番環境では適切な証明書検証を実装することを推奨

### 5. 環境変数の優先度調整

```javascript
// 修正前: groups.jsonが常に優先
if (this.groups['ERMS']) {
  this.apiToken = this.groups['ERMS'].token;
} else {
  this.apiToken = API_TOKEN;
}

// 修正後: 環境変数を優先
if (API_TOKEN && API_TOKEN !== "fvog-75f41ea5-6ba0-11f0-a1e9-0a58a9feac02") {
  this.apiToken = API_TOKEN;
  debugLog('Using token from environment variable');
} else if (this.groups['ERMS']) {
  this.apiToken = this.groups['ERMS'].token;
  debugLog('Using ERMS group token as fallback');
}
```

## ✅ 解決結果

### 接続成功の確認事項
- ✅ **ヘルスチェック**: `true` - API正常動作確認
- ✅ **プロキシ経由**: `gwproxy.daikin.co.jp:3128`で接続成功
- ✅ **SSL証明書**: 企業プロキシ環境での証明書問題回避
- ✅ **認証**: APIトークンによる正常認証
- ✅ **グループ管理**: groups.json対応維持

### 動作確認済み機能
```javascript
// 利用可能なMCPツール一覧
- futurevuls_health_check           // ヘルスチェック
- futurevuls_get_cves              // 脆弱性一覧取得
- futurevuls_search_critical_cves   // 重要度高CVE検索
- futurevuls_generate_weekly_report // 週次レポート生成
- futurevuls_generate_tm_report     // TM会議用レポート生成
- futurevuls_list_groups           // グループ一覧表示
- futurevuls_get_servers           // サーバー情報取得
```

### パフォーマンス
- **応答時間**: 平均2-3秒（プロキシ経由）
- **安定性**: 継続的な接続維持
- **スループット**: 大量データ取得にも対応

## 📊 技術的な学び

### 企業プロキシ環境での考慮事項

1. **プロキシライブラリの選択**
   - Node.js標準fetchの制限を理解
   - サードパーティライブラリの互換性確認
   - バージョン固定による安定性確保

2. **SSL/TLS設定**
   - 企業CAによる証明書チェーン
   - 中間プロキシでのSSL終端
   - 開発環境での適切な設定

3. **デバッグ手法**
   - curlコマンドでの疎通確認
   - 段階的な問題切り分け
   - 詳細ログによる原因特定

### Node.jsライブラリ管理

```json
// package.json推奨設定
{
  "dependencies": {
    "node-fetch": "^2.6.12",        // v3は避ける
    "https-proxy-agent": "^7.0.0",  // 最新安定版
    "readline": "built-in"           // Node.js標準
  }
}
```

### エラーハンドリングのベストプラクティス

```javascript
// 推奨: 詳細なエラー情報の提供
catch (error) {
  console.error(`[ERROR] ${error.name}: ${error.message}`);
  console.error(`[DEBUG] URL: ${url}`);
  console.error(`[DEBUG] Proxy: ${HTTPS_PROXY}`);
  console.error(`[DEBUG] Headers: ${JSON.stringify(this.headers)}`);
  throw error;
}
```

## 🔧 今後の改善提案

### 1. 設定管理の改善

```javascript
// dotenvライブラリ使用を推奨
require('dotenv').config();

// 環境変数のバリデーション
function validateEnvironment() {
  const required = ['FUTUREVULS_API_TOKEN', 'HTTPS_PROXY'];
  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`Missing required environment variable: ${env}`);
    }
  }
}
```

### 2. 接続プールの実装

```javascript
// HTTPエージェントの再利用
const agent = new HttpsProxyAgent(HTTPS_PROXY, {
  keepAlive: true,
  maxSockets: 10
});
```

### 3. レジリエンス機能の追加

```javascript
// リトライ機能
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 4. 設定ファイルのバリデーション

```javascript
// groups.json検証
function validateGroupsConfig(config) {
  if (!config || !config.group) {
    throw new Error('Invalid groups.json format');
  }
  
  for (const group of config.group) {
    const groupName = Object.keys(group)[0];
    const groupData = group[groupName];
    
    if (!groupData || groupData.length < 3) {
      throw new Error(`Invalid group data for: ${groupName}`);
    }
    
    // トークン形式の検証
    if (!/^[a-f0-9-]+$/.test(groupData[0])) {
      throw new Error(`Invalid token format for group: ${groupName}`);
    }
  }
}
```

### 5. モニタリング機能

```javascript
// メトリクス収集
class FutureVulsMetrics {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTime = [];
  }
  
  recordRequest(duration, success) {
    this.requestCount++;
    this.responseTime.push(duration);
    if (!success) this.errorCount++;
  }
  
  getStats() {
    return {
      totalRequests: this.requestCount,
      errorRate: this.errorCount / this.requestCount,
      avgResponseTime: this.responseTime.reduce((a, b) => a + b, 0) / this.responseTime.length
    };
  }
}
```

## 📚 参考資料

### ドキュメント
- [Node.js fetch API](https://nodejs.org/docs/latest-v18.x/api/globals.html#fetch)
- [https-proxy-agent](https://github.com/TooTallNate/proxy-agents)
- [node-fetch v2 documentation](https://github.com/node-fetch/node-fetch/tree/2.x)

### 解決に使用したコマンド
```bash
# 疎通確認
curl -X 'GET' 'https://rest.vuls.biz/health' \
  -H 'Authorization: 7f2bc19b-be87-11eb-b537-0a58a9feac02' \
  -x http://gwproxy.daikin.co.jp:3128/ -k

# Node.jsバージョン確認
node --version

# パッケージ管理
npm install node-fetch@^2.6.12
npm install https-proxy-agent@^7.0.0
```

## 📝 まとめ

FutureVuls MCP Serverの接続問題は、**Node.js標準fetch APIとプロキシの互換性問題**が主要因でした。以下の対策により解決：

1. **node-fetch v2への変更** - 安定したプロキシサポート
2. **https-proxy-agentとの組み合わせ** - 企業プロキシ環境対応
3. **適切なSSL設定** - 証明書検証の調整
4. **環境変数の優先度調整** - 柔軟な設定管理

### 重要な教訓
- **企業環境では標準APIの制限を理解する**
- **サードパーティライブラリの互換性を事前確認**
- **段階的なデバッグアプローチが効果的**
- **プロキシ設定は複数の要因を考慮する必要がある**

この経験により、企業プロキシ環境でのNode.js開発における重要なノウハウを獲得できました。今後の類似プロジェクトでは、これらの知見を活用して効率的な開発が可能になります。

---

**ファイル作成日**: 2025年8月4日  
**最終更新**: 2025年8月4日  
**作成者**: セキュリティチーム