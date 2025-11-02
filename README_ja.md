# FutureVuls MCP Server (Windows版 - Node.js)

![FutureVuls MCP](./img/top.png)

**[English](README.md)** | 日本語

<div align="center">

**FutureVuls 脆弱性管理サービスと連携するモデルコンテキストプロトコル (MCP) サーバー**

</div>

---

## 概要

このプロジェクトは、<img src=./img/future_vuls.png width="10%">FutureVuls APIを<img src=./img/modelcontextprotocol.png width="10%">Model Context Protocol (MCP)経由でアクセスできるようにするWindows向けサーバーです。Claude等のAIアシスタントから脆弱性管理機能を直接利用できます。

### 🎯 主な機能

- **🔍 脆弱性管理**: CVE情報の検索・詳細表示
- **📋 タスク管理**: 脆弱性対応タスクの確認・管理  
- **🖥️ サーバー管理**: 監視対象サーバーの一覧・詳細表示
- **📊 レポート生成**: 週次レポートの自動生成
- **💓 ヘルスチェック**: FutureVuls APIの接続確認

## システム要件

- **OS**: Windows 10/11 (64bit)
- **Node.js**: 18.0以上 (LTS推奨)
- **npm**: Node.jsに同梱
- **Claude Desktop**: 最新版
- **メモリ**: 4GB以上推奨
- **ストレージ**: 1GB以上の空き容量

## セットアップ

> 注: DXT パッケージは現時点では非対応です。シンプルで信頼性の高い npm（グローバルコマンド）方式を推奨します。

### 🚀 かんたん導入（推奨）

```cmd
npm install -g @keides2/futurevuls-mcp
```

ローカルの tgz（オフライン/社内配布）の場合：

```cmd
npm install -g .\keides2-futurevuls-mcp-2.1.0.tgz
```

その後、以下でサーバーを実行できます：

```cmd
futurevuls-mcp
```

### 📦 1. リポジトリのクローン

```cmd
git clone https://github.com/keides2/futurevuls-mcp.git
cd futurevuls-mcp
```

### 🛠️ 2. 自動セットアップ（推奨）

```cmd
scripts\setup_windows.bat
```

このスクリプトが以下を自動実行します：

- Node.js環境の確認
- npm依存関係のインストール
- 設定ファイルテンプレートの作成
- Claude Desktop設定ファイルの作成

### ⚙️ 3. 手動セットアップ

#### Node.js依存関係のインストール

```cmd
npm install
```

#### 設定ファイルの作成

```bash
copy .env.sample .env
copy templates\groups.json.template groups.json

# 他のMCP利用時は上書きに注意
copy templates\claude_desktop_config.json.template "%APPDATA%\Claude\claude_desktop_config.json"
```

### 🔧 4. 設定ファイルの編集

#### .envファイルの設定

メモ帳またはVS Codeで`.env`ファイルを開き、以下を設定：

```bash
# FutureVuls API設定（必須）
FUTUREVULS_API_TOKEN=your_actual_api_token_here

# デバッグモード（オプション）
FUTUREVULS_DEBUG=false
```

#### groups.jsonファイルの設定

`groups.json`ファイルは以下のいずれかの場所に配置できます（**優先順位順**）：

1. **カレントディレクトリ** - コマンド実行時のディレクトリ（最も便利）
2. **スクリプトのディレクトリ** - `futurevuls-mcp.js`が配置されているディレクトリ
3. **ホームディレクトリ** - `C:\Users\[USERNAME]\groups.json`

メモ帳またはVS Codeで`groups.json`ファイルを作成・編集し、実際のグループ情報を以下の書式で設定：

```json
グループ名: [
  "グループトークン",
  "グループID",
  "脆弱性の数"
]
```

**例：**

```json
{
    "group": [
        {
            "本番環境": [
                "fvgs-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                123,
                1500
            ]
        },
        {
            "開発環境": [
                "fvgs-yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy", 
                456,
                800
            ]
        },
        {
          ...
        }
    ]
}
```

> **💡 ヒント**: npmグローバルインストールの場合、Claude Desktopの作業ディレクトリ（通常は`C:\Users\[USERNAME]`）に`groups.json`を配置するのが最も簡単です。

### 🤖 5. Claude Desktop設定

#### 設定ファイルの場所

```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**エクスプローラーでのアクセス方法:**

1. `Win + R` キーを押す
2. `%APPDATA%\Claude` と入力してEnter
3. `claude_desktop_config.json` を編集

#### 設定方法（テンプレート使用）

**方法1: テンプレートをコピー（推奨）**

```bash
# 他のMCP利用時は上書きに注意
copy templates\claude_desktop_config.json.template "%APPDATA%\Claude\claude_desktop_config.json"
```

**方法2: 手動でファイル作成**
メモ帳またはVS Codeで`%APPDATA%\Claude\claude_desktop_config.json`を作成

#### 設定内容の編集

推奨（npm グローバルコマンド利用）：

```json
{
  "mcpServers": {
    "futurevuls": {
      "command": "futurevuls-mcp",
      "args": [],
      "env": {
        "FUTUREVULS_API_TOKEN": "your_actual_api_token_here"
      }
    }
  }
}
```

代替（グローバル導入せず、Node で直指定する場合）：

```json
{
  "mcpServers": {
    "futurevuls": {
      "command": "node",
      "args": ["C:\\Users\\[USERNAME]\\path\\to\\futurevuls-mcp\\futurevuls-mcp.js"],
      "env": {
        "FUTUREVULS_API_TOKEN": "your_actual_api_token_here"
      }
    }
  }
}
```

**⚠️ パス指定の重要な注意点:**

- **絶対パス**を使用してください
- バックスラッシュは`\\`でエスケープ（`\`ではなく`\\`）
- 実際のインストールパスに置き換えてください
- **ファイル名は `futurevuls-mcp.js`** です（Pythonではありません）
- 日本語を含むパスは避けてください

## 使用方法と動作確認

### 💡 MCPサーバーの動作について

**Claude DesktopなどのAIアシスタントは、設定後に自動的にMCPサーバーと通信します。** 
以下の手動起動方法は、主に**設定確認・トラブルシューティング・開発用**です。

### 🔍 1. 動作確認用 - バッチファイルで起動

```cmd
start_mcp.bat
```

**用途**:

- Claude Desktop設定前の動作確認
- エラーメッセージの詳細確認
- ログ出力の監視

### 🔍 2. 動作確認用 - npm グローバルコマンドで起動

```cmd
futurevuls-mcp
```

### 🔍 3. 動作確認用 - Node.js直接実行  

```cmd
node futurevuls-mcp.js
```

**用途**:

- 詳細なデバッグ情報の確認
- npm依存関係の問題特定
- 開発・テスト時の動作確認

### ✅ 正常動作の確認方法

**1. 手動起動での確認**
起動時に以下のようなメッセージが表示されれば正常：

```cmd
FutureVuls MCP Server starting...
Listening on stdio...
Server initialized successfully
```

**2. Claude Desktopでの確認**

- Claude Desktopを再起動
- 「FutureVulsの脆弱性を確認して」などと入力
- MCPツールが認識されて実行されれば成功

## DXT 配布について（現時点では非対応の理由）

現状、DXT 形式での配布・起動は安定性の観点からサポート対象外としています。回避策としては、本文で案内している npm グローバルコマンド（futurevuls-mcp）方式、または Node 直接実行をご利用ください。

### 症状

- Claude Desktop の UtilityProcess 環境で、初期化後に以下が断続的に発生:
  - -32001 Request timed out
  - Unexpected server transport closed
- 同一マシンで Node 直接実行や Content-Length を用いたスモークテストは成功（再現せず）

### 実施した対処

- JSON-RPC の stdin パーサを刷新し、以下に対応:
  - Content-Length フレーミング（LSP準拠）と JSON Lines の両対応
  - ヘッダー終端（CRLFCRLF/LFLF）を柔軟に判定
  - 応答も入力方式に合わせたフレーミングで返却
- initialize 応答の簡素化・メタ情報調整、バージョン更新と再パッケージを複数回実施
- DXT パッケージの再インストール、保存先変更（別ドライブ/ASCIIパス）、拡張の再有効化などを検証
- いずれも一部環境でのみタイムアウト/切断が継続

### 現時点の評価

一部環境における UtilityProcess の stdio/ライフサイクル依存の挙動差が疑われ、DXT での安定性を保証できない状況です。これに対し、npm グローバルコマンド方式は安定しており、運用・配布の簡易性も高いことから、公式の推奨手段としています。

### 方針

- 正式サポート: npm グローバルコマンド（futurevuls-mcp）方式
- 代替手段: Node 直接実行（開発・検証用途）
- DXT: 今後の改善状況を確認しつつ再検証（進展があれば README/リリースノートで告知）

## API機能一覧

| 機能 | 説明 | Claude での使用例 |
|------|------|------------------|
| `futurevuls_health_check` | APIヘルスチェック | "FutureVulsの接続状態を確認して" |
| `futurevuls_list_groups` | グループ一覧取得 | "監視対象グループを教えて" |
| `futurevuls_get_cves` | CVE一覧取得 | "最新の脆弱性リストを表示して" |
| `futurevuls_get_cve_detail` | CVE詳細情報取得 | "CVE-2023-12345の詳細を教えて" |
| `futurevuls_get_tasks` | タスク一覧取得 | "対応すべきタスクはある？" |
| `futurevuls_get_task_detail` | タスク詳細情報取得 | "タスク123の詳細を確認して" |
| `futurevuls_get_servers` | サーバー一覧取得 | "監視中のサーバー一覧を表示" |
| `futurevuls_get_groupset_servers` | グループセットサーバー取得 | "グループセットのサーバーを表示" |
| `futurevuls_get_group_members` | グループメンバー取得 | "グループ123のメンバーを表示" |
| `futurevuls_get_org_groups` | 組織グループ取得 | "組織の全グループを一覧表示" |
| `futurevuls_get_org_members` | 組織メンバー取得 | "組織のメンバーを表示" |
| `futurevuls_search_critical_cves` | 重要度高CVE検索 | "CRITICAL脆弱性を抽出して" |
| `futurevuls_generate_weekly_report` | 週次レポート生成 | "今週の脆弱性レポートを作成" |

## ファイル構成

```text
futurevuls-mcp/
├── 📄 futurevuls-mcp.js           # メインMCPサーバースクリプト
├── 📦 package.json                # Node.js依存関係とメタデータ
├── 🔧 .env.sample                 # 環境変数テンプレート
├── 📖 README.md                   # 英語版README
├── 📖 README_ja.md                # このファイル（日本語版）
├── 📜 LICENSE                     # MITライセンス
├── 📁 docs/                       # ドキュメントディレクトリ
│   ├── 📁 setup/                  # セットアップガイド
│   ├── 📁 guides/                 # ユーザーガイド
│   ├── 📁 releases/               # リリースノート
│   └── 📄 api_sample.txt          # API使用例
├── 📁 scripts/                    # セットアップ・テストスクリプト
│   ├── ⚙️ setup_windows.bat       # Windows自動セットアップ
│   └── 🧪 test-health.js          # ヘルスチェックスクリプト
├── 📁 templates/                  # 設定ファイルテンプレート
│   ├── 📊 groups.json.template    # グループ設定テンプレート
│   └── 🤖 claude_desktop_config.json.template # Claude Desktop設定テンプレート
├── 📁 archive/                    # レガシーファイル・旧バージョン
│   ├── 📄 futurevuls-mcp-legacy.js # レガシーMCPサーバー（VSCode + Cline用）
│   ├── 📦 package.*.json          # 旧パッケージ設定
│   └── 📦 *.tgz                   # 過去リリースパッケージ
├── 🖼️ img/                        # ドキュメント用画像
├── 📁 dxt-init/                   # DXTパッケージング実験（非推奨）
└── 📁 evac/                       # 開発・バックアップファイル
```

### 🔧 サーバーファイルについて

**futurevuls-mcp.js** (メイン)

- Claude Desktop用
- 最新MCPプロトコルバージョン (2024-11-05)
- 通常利用を推奨
- 柔軟なgroups.json配置をサポート

**archive/futurevuls-mcp-legacy.js** (レガシー)

## ファイル構成

```text
```
futurevuls-mcp/
├── 📄 futurevuls-mcp.js           # メインMCPサーバースクリプト
├── 📦 package.json                # Node.js依存関係とメタデータ
├── 🔧 .env.sample                 # 環境変数テンプレート
├── 📖 README.md                   # 英語版README
├── 📖 README_ja.md                # このファイル（日本語版）
├── 📜 LICENSE                     # MITライセンス
├── 📁 docs/                       # ドキュメントディレクトリ
│   ├── � setup/                  # セットアップガイド
│   ├── 📁 guides/                 # ユーザーガイド
│   ├── 📁 releases/               # リリースノート
│   └── 📄 api_sample.txt          # API使用例
├── 📁 scripts/                    # セットアップ・テストスクリプト
│   ├── ⚙️ setup_windows.bat       # Windows自動セットアップ
│   └── 🧪 test-health.js          # ヘルスチェックスクリプト
├── 📁 templates/                  # 設定ファイルテンプレート
│   ├── 📊 groups.json.template    # グループ設定テンプレート
│   └── 🤖 claude_desktop_config.json.template # Claude Desktop設定テンプレート
├── 📁 archive/                    # レガシーファイル・旧バージョン
├── 🖼️ img/                        # ドキュメント用画像
└── 📁 evac/                       # 開発・バックアップファイル
```

### 🔧 サーバーファイルについて

**futurevuls-mcp.js** (メイン)

- Claude Desktop用
- 最新MCPプロトコルバージョン (2025-06-18)
- 一般的な使用に推奨

**futurevuls-mcp-legacy.js** (レガシー)  

- VSCode + Cline用
- レガシーMCPプロトコルバージョン (2024-11-05)
- メイン版が互換性がない場合に使用

## セキュリティ注意事項

⚠️ **重要**: 以下のファイルには機密情報が含まれるため、第三者と共有しないでください：

- `.env` (環境変数・APIトークン)
- `groups.json` (実際のグループ設定)
- `claude_desktop_config.json` (実際のClaude Desktop設定)

---

## 注意

このプロジェクトは Windows 環境での Node.js 使用を前提として設計されています。

---
2025/07/29 keides2 Node.js版対応
