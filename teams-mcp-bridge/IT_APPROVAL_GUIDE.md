# IT部門への権限申請ガイド

FutureVuls Teams MCP Bridge を導入するために必要な権限と申請内容

## ✅ 既に利用可能なサービス

以下のサービスは既に利用中のため、**追加の申請は不要**です:

### 1. ✅ Azure OpenAI Service
- **状態**: 利用中
- **必要な作業**: 既存リソースの利用許可確認のみ
- **確認事項**:
  - 既存の Azure OpenAI リソース名
  - デプロイ済みのモデル（GPT-4o が推奨）
  - エンドポイントとキーへのアクセス権限

### 2. ✅ Microsoft 365 E3
- **状態**: 利用中
- **含まれるサービス**: 
  - Microsoft Teams ✅
  - Power Automate（標準フロー）✅
  - OneDrive for Business ✅
- **確認事項**:
  - Power Automate で HTTP Premium コネクタが使えるか
  - Teams チャネルへの投稿権限

### 3. ✅ Azure Functions App
- **状態**: 利用中
- **メリット**: Azure App Service も同じ権限で利用可能！
- **確認事項**:
  - 既存の App Service Plan を共用できるか
  - 新しい Web App を追加できるか

---

## 📋 必要な申請・確認事項

### 🟡 権限確認が必要（申請不要の可能性大）

#### 1. Azure OpenAI の既存リソース利用

**確認内容:**
```
目的: FutureVuls Teams MCP Bridge での Azure OpenAI 利用
必要な情報:
  - リソース名: [既存のAzure OpenAI リソース名]
  - リソースグループ: [リソースグループ名]
  - デプロイ済みモデル: GPT-4o または GPT-4 が必要
  - アクセス権限: キーの読み取り権限

確認事項:
  □ 既存リソースに GPT-4o がデプロイされているか？
  □ されていない場合、新規デプロイ可能か？
  □ API キーへのアクセス権限はあるか？
  □ または Managed Identity での接続が推奨されるか？
```

**追加コスト:**
- 既存リソースを共用: 使用量に応じた従量課金のみ
- 想定: 約 $15-20/月 追加（100回/日の利用想定）

---

#### 2. Power Automate Premium 機能の利用可否

**確認内容:**
```
目的: Teams と Bridge Server の HTTP 接続
現状: Microsoft 365 E3 に含まれる Power Automate を利用中

確認事項:
  □ HTTP Premium コネクタは利用可能か？
  □ 外部エンドポイント（社内サーバーまたはAzure）への接続は許可されているか？
  □ Power Automate Premium ライセンスが必要か？

代替案:
  - HTTP Premium が使えない場合、Azure Logic Apps の利用を検討
  - Logic Apps: 約 $0.000025/アクション（非常に安価）
```

**追加コスト:**
- E3 に含まれる場合: $0
- Premium が必要な場合: $15/ユーザー/月
- Logic Apps を使う場合: 約 $1-2/月（想定使用量）

---

#### 3. Azure App Service (Web App) の追加

**確認内容:**
```
目的: FutureVuls Teams MCP Bridge Server のホスティング
現状: Azure Functions App 用の App Service Plan が既に存在

確認事項:
  □ 既存の App Service Plan に Web App を追加できるか？
  □ Plan の SKU は何か？（Consumption / Premium / Dedicated）
  □ 新規 Web App 追加による追加コストは？

推奨構成:
  - 既存 Plan が Dedicated（B1以上）の場合: 同じPlanで追加（追加コストほぼゼロ）
  - 既存 Plan が Consumption の場合: 新規 B1 Plan 作成（約 $13/月）
```

**追加コスト:**
- 既存 Plan 共用の場合: **$0** （追加コストなし！）
- 新規 Plan が必要な場合: 約 $13/月

---

### 🟢 申請不要（利用可能）

以下は既に利用可能:

✅ **Microsoft Teams** - 組織アカウントで利用中
✅ **Azure サブスクリプション** - Functions App 利用中
✅ **Node.js 実行環境** - Functions App で実績あり
✅ **FutureVuls API** - 既に契約・使用中

---

## 📝 IT部門への確認テンプレート（簡易版）

### メール/チャットテンプレート

```
件名: FutureVuls Teams統合のための既存Azureリソース利用確認

お世話になっております。

現在、FutureVuls脆弱性管理システムをMicrosoft Teamsと統合し、
チーム全体での利用を促進するプロジェクトを進めています。

既存のAzureリソースを活用できるため、追加コストを最小限に抑えられる見込みです。
以下の点についてご確認・ご協力をお願いできますでしょうか。

【利用したい既存リソース】

1. Azure OpenAI Service
   - 既存リソースを共用して自然言語処理に利用
   - 必要な情報: リソース名、エンドポイント、API キー
   - 追加モデル: GPT-4o のデプロイ（未デプロイの場合）
   - 追加コスト: 約 $15-20/月（使用量課金）

2. Azure App Service / Functions App
   - 既存の App Service Plan に Web App を追加
   - Bridge Server のホスティングに利用
   - 追加コスト: Plan共用なら $0、新規なら約 $13/月

3. Power Automate (Microsoft 365 E3)
   - Teams と Bridge Server の連携に利用
   - HTTP Premium コネクタの利用可否を確認
   - 追加コスト: E3 に含まれる場合は $0

【確認事項】

□ Azure OpenAI の既存リソース名とアクセス方法
□ GPT-4o モデルのデプロイ状況（または新規デプロイ可否）
□ App Service Plan への Web App 追加可否
□ Power Automate での外部 HTTP 接続の許可状況

【導入効果】
- 脆弱性情報へのアクセス性向上（Teamsから直接照会可能）
- 利用者の拡大（現在1名 → チーム全体）
- 既存リソース活用によるコスト最適化

【想定コスト】
- 最小: 約 $15-20/月（Azure OpenAI 使用量のみ）
- 最大: 約 $28-33/月（新規 App Service Plan が必要な場合）

ご確認のほど、よろしくお願いいたします。
```

---

## 🔍 事前確認チェックリスト

IT部門に相談する前に、自分で確認できること:

### Azure Portal で確認

1. **Azure OpenAI リソース**
   ```powershell
   # リソース一覧
   az cognitiveservices account list --query "[?kind=='OpenAI']" -o table
   
   # デプロイ済みモデル確認
   az cognitiveservices account deployment list \
     --name <resource-name> \
     --resource-group <rg-name> -o table
   ```

2. **App Service Plan**
   ```powershell
   # 既存Plan確認
   az appservice plan list -o table
   
   # Plan詳細（SKU確認）
   az appservice plan show \
     --name <plan-name> \
     --resource-group <rg-name> \
     --query "{Name:name, SKU:sku.name, Tier:sku.tier}" -o table
   ```

3. **Power Automate**
   - https://make.powerautomate.com/ にアクセス
   - 新しいフローを作成 → HTTP アクションを検索
   - "HTTP" と "HTTP Premium" の両方が表示されるか確認

### 確認結果の記録

```
【確認結果メモ】

Azure OpenAI:
  リソース名: _________________
  リソースグループ: _________________
  場所: _________________
  デプロイ済みモデル: 
    □ GPT-4o
    □ GPT-4
    □ GPT-3.5-turbo
    □ その他: _________________

App Service Plan:
  Plan名: _________________
  リソースグループ: _________________
  SKU/Tier: _________________
  現在の使用状況: _________________個のアプリ

Power Automate:
  □ HTTP Premium コネクタ利用可能
  □ HTTP 標準コネクタのみ
  □ 不明（要確認）

追加で必要なもの:
  □ Azure OpenAI に GPT-4o デプロイ
  □ App Service Plan の容量追加
  □ Power Automate Premium ライセンス
  □ その他: _________________
```

---

## 💰 コスト見積もり（既存リソース活用版）

### 最小構成（ベストケース）

| 項目 | 既存/新規 | コスト |
|------|-----------|--------|
| Azure OpenAI (共用) | 既存 | **$15-20/月** (使用量のみ) |
| App Service (Plan共用) | 既存 | **$0/月** |
| Power Automate (E3) | 既存 | **$0/月** |
| **合計** | | **約 $15-20/月** |

### 標準構成（一部新規が必要な場合）

| 項目 | 既存/新規 | コスト |
|------|-----------|--------|
| Azure OpenAI (共用) | 既存 | $15-20/月 |
| App Service Plan (新規B1) | 新規 | $13/月 |
| Power Automate Premium | 新規 | $15/月 ※ |
| **合計** | | **約 $43-48/月** |

※ HTTP Premium が必要な場合のみ

### 推奨構成（セキュリティ強化）

| 項目 | 既存/新規 | コスト |
|------|-----------|--------|
| 上記の最小または標準構成 | - | $15-48/月 |
| Azure Key Vault | 新規 | $0.03/月 |
| Application Insights | 新規 | $2-5/月 |
| **合計** | | **約 $17-53/月** |

---

## ⏱️ 導入スケジュール（簡略版）

| フェーズ | 期間 | タスク |
|---------|------|--------|
| **Phase 0: 事前確認** | 1-2日 | ・Azure リソース確認<br>・Power Automate 機能確認<br>・このガイドに基づいた情報収集 |
| **Phase 1: IT確認** | 2-3日 | ・IT部門へ確認メール送信<br>・必要な情報の取得<br>・アクセス権限の確認 |
| **Phase 2: 開発** | 2-3日 | ・.env 設定<br>・ローカルテスト<br>・Azure へのデプロイ準備 |
| **Phase 3: デプロイ** | 1日 | ・Azure Web App 作成<br>・コードデプロイ<br>・動作確認 |
| **Phase 4: Teams統合** | 1-2日 | ・Power Automate フロー作成<br>・Teams での動作確認 |
| **合計** | **約 1-2週間** | |

---

## 💡 IT部門への説明ポイント

### 1. 既存リソースの有効活用

❌ **「新しいサービスが必要です」**

✅ **「既にお使いの Azure OpenAI と Functions の環境を活用して、追加コストを最小限に抑えます」**

### 2. コスト最適化

❌ **「月額$50かかります」**

✅ **「既存リソース共用で月額$15-20のみ。新規構築より$30以上削減できます」**

### 3. 段階的導入

❌ **「全社展開します」**

✅ **「まず開発チーム5名で1ヶ月試して、効果を確認してから展開を判断します」**

### 4. リスク管理

✅ **「Azure Cost Management で予算アラート設定」**
✅ **「Key Vault でセキュアなシークレット管理」**
✅ **「Application Insights で監視体制構築」**

---

## ✅ 次のアクションアイテム

### 今すぐできること

- [ ] Azure Portal で既存リソースを確認
- [ ] 確認結果メモを記入
- [ ] Power Automate で HTTP コネクタの確認
- [ ] IT部門への確認メールを準備

### IT部門とのやり取り

- [ ] 確認メールを送信
- [ ] Azure OpenAI のアクセス情報を取得
- [ ] App Service Plan の利用許可を取得
- [ ] 必要に応じて追加デプロイの承認を得る

### 開発・テスト

- [ ] `.env` ファイルの設定
- [ ] ローカル環境でのテスト
- [ ] Azure へのデプロイ
- [ ] Power Automate フロー作成
- [ ] Teams での動作確認

---

## 🎉 まとめ

### 良いニュース！

1. ✅ **Azure OpenAI** - 既に利用中（追加デプロイのみ確認）
2. ✅ **Microsoft 365 E3** - Power Automate 含む（Premium確認のみ）
3. ✅ **Azure Functions** - App Service も使える（ほぼ追加コストなし）

### 必要な作業

1. 🔍 既存リソースの詳細確認（自分でできる）
2. 📧 IT部門への簡単な確認メール（テンプレート用意済み）
3. ⚙️ 設定とデプロイ（技術的作業）

### 想定コスト

- **最良**: 約 **$15-20/月** のみ！
- **最大**: 約 $43-48/月（新規リソース必要な場合）

---

**次のステップ:** 
1. Azure Portal で確認チェックリストを実施
2. IT部門に確認メールを送信
3. 承認後、開発を開始！

これなら承認も早そうですね! 🚀

