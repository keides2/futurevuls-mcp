# FutureVuls MCP DXTパッケージ化手順書

**Node.js MCPサーバーをClaude Desktop用DXTパッケージ化する完全ガイド**

## 📋 前提条件

### 必要なツール
- **Node.js**: v18以上
- **DXTツールチェーン**: `npm install -g @anthropic-ai/dxt`
- **Git**: バージョン管理用
- **PowerShell**: Windows環境での作業

### 対象プロジェクト
- **プロジェクト名**: FutureVuls MCP
- **GitHub**: https://github.com/keides2/futurevuls-mcp
- **言語**: Node.js (Not Python!)
- **MCPサーバー**: FutureVuls脆弱性管理サービス連携

## 🚀 ステップ1: プロジェクトの準備

### 1.1 プロジェクトのクローン
```powershell
# 作業ディレクトリの作成
mkdir futurevuls-dxt-work
cd futurevuls-dxt-work

# プロジェクトのクローン
git clone https://github.com/keides2/futurevuls-mcp.git
cd futurevuls-mcp
```

### 1.2 プロジェクト構造の確認
```powershell
# プロジェクト構造を確認
tree /F
```

**期待される構造**:
```
├── futurevuls-mcp.js          # メインMCPサーバー
├── package.json               # Node.js依存関係
├── package-lock.json          # 依存関係ロック
├── .env.sample               # 環境変数テンプレート
├── groups.json.template      # グループ設定テンプレート
├── README.md                 # ドキュメント
├── LICENSE                   # ライセンス
└── node_modules/             # 依存関係（DXTには含めない）
```

### 1.3 重要ファイルの内容確認
```powershell
# package.jsonの内容確認
Get-Content package.json

# メインファイルの先頭部分確認（shebang行の確認）
Get-Content futurevuls-mcp.js | Select-Object -First 20

# 環境変数テンプレート確認
Get-Content .env.sample
```

**確認ポイント**:
- ✅ `#!/usr/bin/env node` の存在
- ✅ エントリーポイント: `futurevuls-mcp.js`
- ✅ 必要な環境変数: `FUTUREVULS_API_TOKEN`

## 🔧 ステップ2: DXT用クリーンディレクトリの準備

### 2.1 クリーンなディレクトリの作成
```powershell
# DXT用ディレクトリを作成（現在のディレクトリ下）
mkdir futurevuls-mcp-dxt
cd futurevuls-mcp-dxt
```

### 2.2 必要ファイルのコピー
```powershell
# 必要ファイルのコピー（node_modulesは除外）
Copy-Item ..\futurevuls-mcp.js .\
Copy-Item ..\package.json .\
Copy-Item ..\package-lock.json .\
Copy-Item ..\.env.sample .\
Copy-Item ..\groups.json.template .\
Copy-Item ..\README.md .\
Copy-Item ..\LICENSE .\

# ディレクトリ構造確認
tree /F
```

**期待される構造**:
```
C:\...\futurevuls-mcp\futurevuls-mcp-dxt
├── .env.sample
├── futurevuls-mcp.js
├── groups.json.template
├── LICENSE
├── package-lock.json
├── package.json
└── README.md
```

## 📄 ステップ3: manifest.jsonの作成

### 3.1 manifest.jsonファイル作成
```powershell
# manifest.jsonをメモ帳で作成
notepad manifest.json
```

### 3.2 manifest.json内容
```json
{
  "dxt_version": "0.1",
  "name": "futurevuls-mcp",
  "version": "1.0.0",
  "description": "Model Context Protocol server for FutureVuls vulnerability management service integration",
  "author": {
    "name": "keides2",
    "email": "keides2@example.com"
  },
  "server": {
    "type": "node",
    "entry_point": "futurevuls-mcp.js",
    "mcp_config": {
      "command": "node",
      "args": [
        "${__dirname}/futurevuls-mcp.js"
      ],
      "env": {
        "FUTUREVULS_API_TOKEN": "${FUTUREVULS_API_TOKEN}",
        "FUTUREVULS_BASE_URL": "${FUTUREVULS_BASE_URL}",
        "FUTUREVULS_DEBUG": "${FUTUREVULS_DEBUG}",
        "HTTP_PROXY": "${HTTP_PROXY}",
        "HTTPS_PROXY": "${HTTPS_PROXY}",
        "NO_PROXY": "${NO_PROXY}",
        "SSL_VERIFY": "${SSL_VERIFY}"
      }
    }
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/keides2/futurevuls-mcp.git"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "futurevuls",
    "vulnerability",
    "security",
    "claude",
    "proxy",
    "office"
  ]
}
```

### 3.3 保存方法
1. メモ帳で「ファイル」→「名前を付けて保存」
2. ファイル名: `manifest.json`
3. エンコード: `UTF-8`
4. 保存

## ✅ ステップ4: DXTパッケージの検証とビルド

### 4.1 manifest.jsonの検証
```powershell
# 現在のディレクトリ構造確認
tree /F

# manifest.jsonの検証
dxt validate manifest.json
```

**期待される結果**: `Manifest is valid!`

### 4.2 よくあるエラーと対処法

#### エラー: `Unrecognized key(s): 'engines', 'dependencies'`
**対処法**: manifest.jsonから以下を削除
```json
// ❌ 削除が必要
"engines": { ... },
"dependencies": { ... }
```

#### エラー: `dxt: command not found`
**対処法**: DXTツールチェーンをインストール
```powershell
npm install -g @anthropic-ai/dxt
```

### 4.3 DXTパッケージのビルド
```powershell
# DXTパッケージのビルド
dxt pack
```

**成功の確認**:
```
📦  futurevuls-mcp@1.0.0
Archive Contents
  30.6kB futurevuls-mcp.js
    375B groups.json.template
   1.1kB LICENSE
   1.1kB manifest.json
    976B package.json
   7.7kB README.md
Archive Details
name: futurevuls-mcp
version: 1.0.0
filename: futurevuls-mcp-1.0.0.dxt
package size: 12.0kB
unpacked size: 41.9kB
```

## 🧪 ステップ5: パッケージ内容の確認

### 5.1 DXTファイルの確認
```powershell
# 生成されたファイルの確認
ls *.dxt

# ファイルサイズの確認
Get-ChildItem *.dxt | Format-Table Name, Length, LastWriteTime
```

### 5.2 パッケージ内容の検証
```powershell
# DXTファイルをZIPとして展開（内容確認用）
Copy-Item "futurevuls-mcp-dxt.dxt" "futurevuls-mcp-test.zip"
Expand-Archive -Path "futurevuls-mcp-test.zip" -DestinationPath "verify-contents" -Force
tree verify-contents /F
```

**期待される内容**:
```
verify-contents/
├── futurevuls-mcp.js
├── groups.json.template
├── LICENSE
├── manifest.json
├── package.json
└── README.md
```

## 📦 ステップ6: 最終的なクリーンアップ

### 6.1 一時ファイルの削除
```powershell
# 一時ファイルの削除
Remove-Item "futurevuls-mcp-test.zip" -Force
Remove-Item -Recurse "verify-contents" -Force
```

### 6.2 配布用ファイル名の設定
```powershell
# 配布用ファイル名にリネーム
Copy-Item "futurevuls-mcp-dxt.dxt" "..\futurevuls-mcp-v1.0.0-dxt.dxt"

# 不要なディレクトリを削除
cd ..
Remove-Item -Recurse "futurevuls-dxt-work" -Force

# 最終確認
ls *dxt*
```

## 🎯 最終成果物

### 成功時の出力
```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        2025/08/10     18:12                futurevuls-mcp-dxt
-a----        2025/08/10     18:08          12257 futurevuls-mcp-v1.0.0-dxt.dxt
```

### DXTパッケージ詳細
- **ファイル名**: `futurevuls-mcp-v1.0.0-dxt.dxt`
- **サイズ**: 約12KB（非常にコンパクト）
- **含まれるファイル**: 6個
- **Claude Desktop**: ワンクリックインストール対応

## 🚀 配布と使用方法

### GitHubリリースでの配布
1. GitHubプロジェクトのReleasesページにアクセス
2. "Create a new release"をクリック
3. タグ: `v1.0.0-dxt`
4. リリースタイトル: `FutureVuls MCP DXT Package v1.0.0`
5. DXTファイルをアップロード
6. リリース公開

### Claude Desktopでの使用方法
1. `futurevuls-mcp-v1.0.0-dxt.dxt`をダウンロード
2. Claude Desktopの設定画面から拡張機能をインストール
3. 必要な環境変数を設定：
   - `FUTUREVULS_API_TOKEN`: FutureVuls APIトークン
   - その他のオプション設定

## 🛠️ トラブルシューティング

### よくある問題と解決方法

#### 1. manifest.json検証エラー
```
ERROR: Unrecognized key(s): 'engines', 'dependencies'
```
**解決策**: Node.js MCPでは`engines`と`dependencies`をmanifest.jsonから削除

#### 2. DXTコマンドエラー
```
dxt: command not found
```
**解決策**: 
```powershell
npm install -g @anthropic-ai/dxt
```

#### 3. パッケージサイズ過大
**解決策**: 
- `node_modules`ディレクトリを除外
- 不要な開発ファイルを除外
- クリーンディレクトリで作業

#### 4. 文字化けエラー
**解決策**: 
- manifest.jsonをUTF-8エンコードで保存
- PowerShellで`chcp 65001`を実行

## 📚 重要なポイント

### Node.js MCP特有の注意点
1. **manifest.json**: `engines`と`dependencies`は不要
2. **実行環境**: `node`コマンドでの実行
3. **エントリーポイント**: `.js`ファイルを直接指定
4. **依存関係**: package.jsonは含めるが、node_modulesは除外

### Python MCPとの違い
| 項目 | Node.js MCP | Python MCP |
|------|-------------|------------|
| type | "node" | "python" |
| entry_point | "main.js" | "src/package/main.py" |
| command | "node" | "python" |
| manifest.json | engines/dependencies不要 | 必要 |

## ✅ チェックリスト

### 作業前確認
- [ ] Node.js 18以上がインストール済み
- [ ] DXTツールチェーンがインストール済み
- [ ] プロジェクトが正常に動作する

### パッケージ作成
- [ ] クリーンなディレクトリで作業
- [ ] 必要ファイルのみをコピー
- [ ] manifest.jsonを正しく作成（engines/dependencies除外）
- [ ] `dxt validate`でエラーなし
- [ ] `dxt pack`でパッケージ生成成功

### 最終確認
- [ ] DXTファイルサイズが適切（10KB前後）
- [ ] パッケージ内容の確認完了
- [ ] 配布用ファイル名に変更
- [ ] 一時ファイルのクリーンアップ完了

---

**作成日**: 2025/08/10  
**対象**: FutureVuls MCP の Node.js MCPサーバー  
**動作確認**: Windows 10/11 + Claude Desktop  
**最終成果物**: futurevuls-mcp-v1.0.0-dxt.dxt (12KB)