# FutureVuls MCP Server - Windows版 Getting Started Guide

この文書では、Windows環境でのFutureVuls MCP Serverの導入から基本的な使用方法まで、ステップバイステップで説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [インストールとセットアップ](#インストールとセットアップ)
3. [APIトークンの取得](#apiトークンの取得)
4. [基本的な使用方法](#基本的な使用方法)
5. [よく使用するツール](#よく使用するツール)
6. [トラブルシューティング](#トラブルシューティング)

## 🔧 前提条件

開始する前に、以下の要件を満たしていることを確認してください：

### システム要件
- **OS**: Windows 10/11 (64-bit推奨)
- **Python**: 3.8以上 ([Python.org](https://www.python.org/downloads/)からダウンロード)
- **PowerShell**: 5.1以上 (Windows 10/11に標準搭載)
- **インターネット接続**: FutureVuls APIへのアクセス用

### 推奨開発環境
- **Visual Studio Code**: Python開発用
- **Windows Terminal**: 快適なコマンドライン操作用
- **Git for Windows**: ソースコード管理用

### FutureVulsアカウント
- FutureVulsアカウント（無料トライアルまたは有料プラン）
- API権限を持つトークンが生成可能

## 🚀 インストールとセットアップ

### ステップ1: Pythonのインストール確認

```powershell
# PowerShellを管理者権限で起動
# Pythonがインストールされているか確認
python --version
pip --version
```

Pythonがインストールされていない場合：
1. [Python.org](https://www.python.org/downloads/)から最新版をダウンロード
2. インストール時に「Add Python to PATH」にチェックを入れる
3. PowerShellを再起動して確認

### ステップ2: プロジェクトのセットアップ

```powershell
# 作業ディレクトリの作成
mkdir C:\FutureVuls
cd C:\FutureVuls

# Gitリポジトリをクローン
git clone https://github.com/keides2/futurevuls-mcp.git .

# または、直接ZIPファイルをダウンロードして展開
# https://github.com/keides2/futurevuls-mcp/archive/refs/heads/main.zip
```

### ステップ3: 仮想環境の作成と有効化

```powershell
# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
.\venv\Scripts\Activate.ps1

# 実行ポリシーエラーが出る場合
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\venv\Scripts\Activate.ps1
```

### ステップ4: 依存関係のインストール

```powershell
# 仮想環境が有効化されていることを確認
# プロンプトに (venv) が表示されているはず

# パッケージのアップグレード
python -m pip install --upgrade pip

# 依存関係のインストール
pip install -r requirements.txt
```

### ステップ5: 環境設定ファイルの作成

```powershell
# サンプル設定ファイルをコピー
copy .env.sample .env

# メモ帳で編集
notepad .env
```

最低限、以下の設定が必要です：

```env
# 必須: FutureVuls APIトークン
FUTUREVULS_API_TOKEN=your_actual_api_token_here

# オプション: カスタムベースURL（オンプレミス環境の場合）
# FUTUREVULS_BASE_URL=https://your-custom-futurevuls-instance.com

# オプション: タイムアウト設定（秒）
# FUTUREVULS_TIMEOUT=30

# Windows用オプション: 文字エンコーディング
# OUTPUT_ENCODING=utf-8
```

## 🔑 APIトークンの取得

FutureVuls APIトークンを取得するには、以下の手順に従ってください：

### グループAPIトークンの取得

1. **FutureVulsにログイン**
   - ブラウザでFutureVulsにアクセス
   - 認証情報でログイン

2. **グループ設定に移動**
   - 左側メニューから「設定」を選択
   - 「グループ設定」をクリック

3. **トークンページにアクセス**
   - 「トークン」タブをクリック

4. **新しいトークンを作成**
   - 「トークン追加」ボタンをクリック
   - トークン名を入力（例：「MCP Server Token」）
   - 必要な権限を選択：
     - **読み込み**: データの取得のみ
     - **読み込み、更新**: データの取得と更新
     - **読み込み、更新、グループ設定**: 全ての操作

5. **トークンをコピー**
   - 生成されたトークンをコピー
   - `.env`ファイルの`FUTUREVULS_API_TOKEN`に設定

### 権限レベルの選択指針

| 用途 | 推奨権限 | 説明 |
|------|---------|------|
| 監視・レポート | 読み込み | 脆弱性データの参照のみ |
| タスク管理 | 読み込み、更新 | タスクの更新、コメント追加 |
| フル管理 | 読み込み、更新、グループ設定 | サーバー作成・削除など |

## 💡 基本的な使用方法

### MCPサーバーの起動

```powershell
# 仮想環境を有効化（毎回必要）
cd C:\FutureVuls
.\venv\Scripts\Activate.ps1

# MCPサーバーを起動
python futurevuls_mcp.py
```

### 便利なバッチファイルの作成

効率的な運用のため、バッチファイルを作成することをお勧めします：

```batch
REM start_futurevuls.bat
@echo off
cd /d C:\FutureVuls
call .\venv\Scripts\Activate.bat
python futurevuls_mcp.py
pause
```

### 初回接続テスト

MCPサーバーが正常に動作するかテストしましょう：

```python
# ヘルスチェック
futurevuls_health_check()

# 基本的なデータ取得
futurevuls_get_servers(limit=5)
futurevuls_get_cves(limit=5)
```

## 🛠️ よく使用するツール

### 1. システム監視

```python
# システム全体の概要を取得
health_status = futurevuls_health_check()
servers = futurevuls_get_servers()
tasks = futurevuls_get_tasks(filter_status=["new", "investigating"])
```

### 2. 脆弱性分析

```python
# 高優先度の脆弱性を取得
high_priority_tasks = futurevuls_get_tasks(
    filter_priority=["high"],
    filter_status=["new"],
    limit=50
)

# 特定のCVEの詳細を確認
cve_detail = futurevuls_get_cve_detail(cve_id="CVE-2024-1234")
```

### 3. サーバー管理

```python
# 特定サーバーの脆弱性を確認
server_cves = futurevuls_get_cves(filter_server_id=123)
server_detail = futurevuls_get_server_detail(server_id=123)

# 新しいサーバーを追加
new_server = futurevuls_create_pseudo_server(
    server_name="test-server-01"
)
```

### 4. タスク管理

```python
# タスクの詳細を確認
task_detail = futurevuls_get_task_detail(task_id=456)

# タスクを更新
futurevuls_update_task(
    task_id=456,
    task_data={
        "status": "investigating",
        "priority": "high",
        "mainUserID": 1
    }
)

# コメントを追加
futurevuls_add_task_comment(
    task_id=456,
    comment_content="調査開始しました",
    need_group_notice=True
)
```

### 5. レポート生成

```python
# 月次セキュリティレポート用データ
all_tasks = futurevuls_get_tasks(limit=1000)
all_servers = futurevuls_get_servers(limit=1000)
high_priority_cves = futurevuls_get_cves(limit=1000)

# データを分析してレポート生成
# （分析ロジックは別途実装）
```

## 🔍 実践的な使用例

### 例1: 緊急脆弱性の確認

```python
# KEV（Known Exploited Vulnerabilities）の確認
critical_tasks = futurevuls_get_tasks(
    filter_priority=["high"],
    filter_status=["new"],
    limit=100
)

# 各タスクの詳細を確認
for task in critical_tasks.get("tasks", []):
    task_detail = futurevuls_get_task_detail(task_id=task["id"])
    print(f"CVE: {task['cveID']}, Server: {task['serverName']}")
```

### 例2: サーバーグループの一括監視

```python
# 特定ロールのサーバー群を監視
web_servers = futurevuls_get_servers(filter_role_id=1)  # Webサーバーロール

for server in web_servers.get("servers", []):
    # 各サーバーの脆弱性状況を確認
    server_tasks = futurevuls_get_tasks(
        filter_server_id=server["id"],
        filter_status=["new", "investigating"]
    )
    print(f"Server: {server['serverName']}, Active tasks: {len(server_tasks.get('tasks', []))}")
```

### 例3: 自動タスク割り当て

```python
# 新しいタスクを担当者に自動割り当て
new_tasks = futurevuls_get_tasks(
    filter_status=["new"],
    limit=50
)

for task in new_tasks.get("tasks", []):
    # 優先度に応じて担当者を決定
    if task["priority"] == "high":
        main_user_id = 1  # シニアエンジニア
    else:
        main_user_id = 2  # ジュニアエンジニア
    
    # タスクを更新
    futurevuls_update_task(
        task_id=task["id"],
        task_data={
            "status": "investigating",
            "mainUserID": main_user_id
        }
    )
```

## ❗ トラブルシューティング

### Windows固有の問題と解決方法

#### 1. PowerShell実行ポリシーエラー

**症状**: 
```
.\venv\Scripts\Activate.ps1 : ファイル ... を読み込めません。この系統では、スクリプトの実行が無効になっています
```

**解決方法**:
```powershell
# 現在のポリシーを確認
Get-ExecutionPolicy

# 実行ポリシーを変更（現在のユーザーのみ）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 確認
Get-ExecutionPolicy
```

#### 2. 文字エンコーディングの問題

**症状**: 
```
日本語が文字化けする
```

**解決方法**:
```powershell
# PowerShellの文字エンコーディングを設定
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# または.envファイルに追加
echo "OUTPUT_ENCODING=utf-8" >> .env
```

#### 3. ファイアウォール/プロキシの問題

**症状**:
```
Failed to connect to FutureVuls API: Connection error
```

**解決方法**:
```powershell
# プロキシ設定を確認
netsh winhttp show proxy

# pipでプロキシを使用する場合
pip install --proxy http://proxy.company.com:8080 -r requirements.txt
```

#### 4. Visual Studio C++ Build Toolsエラー

**症状**:
```
Microsoft Visual C++ 14.0 is required
```

**解決方法**:
1. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)をダウンロード
2. "C++ build tools"をインストール
3. または、事前コンパイル済みパッケージを使用：
```powershell
pip install --only-binary=all -r requirements.txt
```

#### 5. パス区切り文字の問題

**症状**:
```
ファイルパスでエラーが発生
```

**解決方法**:
```python
import os

# OS非依存のパス結合
config_path = os.path.join("config", "settings.json")

# Windowsでも動作するパス指定
file_path = r"C:\FutureVuls\data\report.csv"
```

### 一般的な問題と解決方法

#### 認証エラー (401 Unauthorized)

```powershell
# .envファイルを確認
type .env | findstr FUTUREVULS_API_TOKEN

# 環境変数が読み込まれているか確認
python -c "import os; print(os.getenv('FUTUREVULS_API_TOKEN'))"
```

#### 接続タイムアウト

```env
# .envファイルでタイムアウトを延長
FUTUREVULS_TIMEOUT=60
```

### Windows用便利スクリプト

#### 定期実行用タスクスケジュール設定

```batch
REM scheduled_check.bat
@echo off
cd /d C:\FutureVuls
call .\venv\Scripts\Activate.bat
python -c "
import futurevuls_mcp
# 定期チェック処理
health = futurevuls_mcp.futurevuls_health_check()
print('Health check completed')
"
```

Windows タスクスケジューラで上記バッチファイルを定期実行に設定できます。

#### ログ出力設定

```powershell
# ログファイルにリダイレクト
python futurevuls_mcp.py 2>&1 | Tee-Object -FilePath "C:\FutureVuls\logs\$(Get-Date -Format 'yyyyMMdd').log"
```

## 🎯 Windows環境での次のステップ

基本的な使用方法をマスターしたら、以下にチャレンジしてみてください：

1. **Windows Serviceとして実行**: NSSM (Non-Sucking Service Manager) を使用
2. **PowerShell ISEでの開発**: 対話的な開発環境
3. **Excel連携**: xlwingsを使用したExcelレポート自動生成
4. **Windows Defender連携**: セキュリティ情報の統合
5. **IIS統合**: WebアプリケーションとしてのIIS展開

### Windows Service として実行

```powershell
# NSSMのインストール（Chocolateyを使用）
choco install nssm

# サービスの作成
nssm install FutureVulsMCP "C:\FutureVuls\venv\Scripts\python.exe"
nssm set FutureVulsMCP Parameters "C:\FutureVuls\futurevuls_mcp.py"
nssm set FutureVulsMCP AppDirectory "C:\FutureVuls"

# サービスの開始
nssm start FutureVulsMCP
```

詳細な機能については、[README.md](README.md)をご参照ください。

---

**Happy Securing on Windows! 🛡️🪟**