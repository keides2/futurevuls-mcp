#!/usr/bin/env node
/**
 * FutureVuls Teams MCP Bridge Server v2.0
 * Microsoft Teams統合 + Azure OpenAI による自然言語理解
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === 'true';

// ===== ミドルウェア設定 =====
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// デバッグログ
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// ===== Azure OpenAI クライアント =====
const azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY;
const azureOpenAIDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
const maxTokens = parseInt(process.env.MAX_TOKENS) || 2048;
const temperature = parseFloat(process.env.TEMPERATURE) || 0.1;

let openAIClient = null;

if (azureOpenAIEndpoint && azureOpenAIKey) {
  openAIClient = new OpenAIClient(
    azureOpenAIEndpoint,
    new AzureKeyCredential(azureOpenAIKey)
  );
  console.log('✅ Azure OpenAI クライアント初期化完了');
} else {
  console.warn('⚠️  Azure OpenAI 設定が不完全です（自然言語理解は無効）');
}

// ===== MCP Client (stdio通信) =====
class MCPClient {
  constructor() {
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.buffer = '';
  }

  async start() {
    const mcpServerPath = process.env.MCP_SERVER_PATH || '../futurevuls-mcp.js';
    
    console.log(`🚀 MCPサーバーを起動中: ${mcpServerPath}`);
    
    this.process = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.stdout.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr.on('data', (data) => {
      console.error('MCP Server stderr:', data.toString());
    });

    this.process.on('close', (code) => {
      console.log(`MCP Server プロセスが終了しました (code: ${code})`);
    });

    // 初期化
    await this.initialize();
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        debugLog('MCP応答:', message);

        if (message.id && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id);
          this.pendingRequests.delete(message.id);

          if (message.error) {
            reject(new Error(message.error.message || 'MCP Error'));
          } else {
            resolve(message.result);
          }
        }
      } catch (err) {
        debugLog('JSON parse error:', err.message);
      }
    }
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });
      
      const requestStr = JSON.stringify(request) + '\n';
      debugLog('MCP送信:', request);
      
      this.process.stdin.write(requestStr);

      // タイムアウト設定 (30秒)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  async initialize() {
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'futurevuls-teams-bridge',
        version: '2.0.0'
      }
    });
    console.log('✅ MCPサーバー初期化完了');
  }

  async callTool(toolName, args) {
    const result = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });
    return result;
  }

  async listTools() {
    const result = await this.sendRequest('tools/list', {});
    return result.tools || [];
  }
}

// MCP Client インスタンス
const mcpClient = new MCPClient();

// ===== Claude AI による自然言語理解 =====

// MCP ツール定義（Claude に教える用）
const MCP_TOOLS_DESCRIPTION = `
利用可能なFutureVuls MCPツール:

1. futurevuls_list_groups
   説明: 登録されているグループの一覧を取得
   パラメータ: なし
   
2. futurevuls_get_cves
   説明: 脆弱性情報を取得
   パラメータ:
   - groupId (必須): グループID
   - page (オプション): ページ番号 (デフォルト: 1)
   - limit (オプション): 取得件数 (デフォルト: 20, 最大: 100)
   - filterCveId (オプション): CVE IDでフィルタ (例: "CVE-2025-")
   - filterSeverity (オプション): 重要度でフィルタ (critical, high, medium, low)

3. futurevuls_get_cve_detail
   説明: 特定のCVEの詳細情報を取得
   パラメータ:
   - groupId (必須): グループID
   - cveId (必須): CVE ID (例: "CVE-2025-12345")

4. futurevuls_search_critical_cves
   説明: 重大な脆弱性を検索
   パラメータ:
   - groupId (必須): グループID
   - minCvss (オプション): 最小CVSS スコア (デフォルト: 7.0)
   - startDate (オプション): 開始日 (YYYYMMDD形式)
   - endDate (オプション): 終了日 (YYYYMMDD形式)

5. futurevuls_get_tasks
   説明: タスク一覧を取得
   パラメータ:
   - groupId (必須): グループID

6. futurevuls_get_servers
   説明: サーバー一覧を取得
   パラメータ:
   - groupId (必須): グループID

7. futurevuls_generate_weekly_report
   説明: 週次レポートを生成
   パラメータ:
   - groupId (必須): グループID

8. futurevuls_health_check
   説明: FutureVuls API のヘルスチェック
   パラメータ: なし
`;

async function parseQueryWithAzureOpenAI(query, groupId = null) {
  if (!openAIClient) {
    console.warn('⚠️  Azure OpenAI が設定されていません。フォールバック処理を実行します。');
    return {
      tool: 'futurevuls_list_groups',
      args: {},
      explanation: 'Azure OpenAI が未設定のため、グループ一覧を表示します'
    };
  }

  try {
    const systemPrompt = `あなたはFutureVuls MCPツールを選択する専門アシスタントです。

${MCP_TOOLS_DESCRIPTION}

ユーザーの質問を分析して、最適なMCPツールとパラメータを選択してください。

応答は以下のJSON形式で返してください（他のテキストは不要）:
{
  "tool": "ツール名",
  "args": {
    "パラメータ名": "値"
  },
  "explanation": "なぜこのツールを選んだか（日本語で簡潔に）"
}

重要なルール:
- groupIdが必要なツールの場合、必ず args に含める
- CVE IDパターン（CVE-YYYY-NNNNN）を検出したら適切に処理
- 日付は YYYYMMDD 形式で指定
- 不明な点がある場合は futurevuls_list_groups を選択`;

    const userMessage = groupId 
      ? `グループID: ${groupId}\n\nユーザーの質問: ${query}`
      : `ユーザーの質問: ${query}`;

    console.log(`🤖 Azure OpenAI で解析中: "${query}"`);

    const response = await openAIClient.getChatCompletions(
      azureOpenAIDeployment,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      {
        maxTokens: maxTokens,
        temperature: temperature
      }
    );

    const responseText = response.choices[0].message.content;
    debugLog('Azure OpenAI 応答:', responseText);

    // JSON部分を抽出（```json マーカーがある場合も対応）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Azure OpenAI 応答からJSONを抽出できませんでした');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // groupIdが指定されていて、ツールがそれを必要とする場合は追加
    if (groupId && !parsed.args.groupId && parsed.tool !== 'futurevuls_list_groups' && parsed.tool !== 'futurevuls_health_check') {
      parsed.args.groupId = groupId;
    }

    console.log(`✅ ツール選択: ${parsed.tool}`, parsed.explanation ? `(${parsed.explanation})` : '');
    debugLog('パラメータ:', parsed.args);

    return parsed;

  } catch (error) {
    console.error('❌ Azure OpenAI エラー:', error.message);
    
    // フォールバック: グループ一覧を返す
    return {
      tool: 'futurevuls_list_groups',
      args: {},
      explanation: 'エラーが発生したため、グループ一覧を表示します'
    };
  }
}

// ===== Adaptive Card 生成 =====
function createAdaptiveCard(title, data, queryInfo = {}) {
  const card = {
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'Container',
            items: [
              {
                type: 'TextBlock',
                text: '🔒 FutureVuls',
                weight: 'bolder',
                size: 'large',
                color: 'accent'
              },
              {
                type: 'TextBlock',
                text: title,
                weight: 'bolder',
                size: 'medium',
                wrap: true
              }
            ]
          }
        ]
      }
    }]
  };

  // クエリ情報表示
  if (queryInfo.query) {
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: `💬 質問: ${queryInfo.query}`,
      wrap: true,
      isSubtle: true,
      spacing: 'small'
    });
  }

  if (queryInfo.explanation) {
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: `🤖 ${queryInfo.explanation}`,
      wrap: true,
      isSubtle: true,
      color: 'good',
      spacing: 'small'
    });
  }

  // データの種類に応じて内容を追加
  if (data.content && Array.isArray(data.content)) {
    // MCP のレスポンス形式
    data.content.forEach(item => {
      if (item.type === 'text') {
        card.attachments[0].content.body.push({
          type: 'TextBlock',
          text: item.text,
          wrap: true,
          separator: true
        });
      }
    });
  } else if (Array.isArray(data)) {
    // 配列データ（グループ一覧など）
    const itemsText = data.slice(0, 10).map((item, index) => 
      `${index + 1}. ${JSON.stringify(item, null, 2)}`
    ).join('\n\n');
    
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: itemsText,
      wrap: true,
      separator: true,
      fontType: 'monospace'
    });

    if (data.length > 10) {
      card.attachments[0].content.body.push({
        type: 'TextBlock',
        text: `... 他 ${data.length - 10} 件`,
        isSubtle: true
      });
    }
  } else if (typeof data === 'string') {
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: data,
      wrap: true,
      separator: true
    });
  } else if (typeof data === 'object') {
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: JSON.stringify(data, null, 2),
      wrap: true,
      separator: true,
      fontType: 'monospace'
    });
  }

  // アクションボタン
  card.attachments[0].content.actions = [
    {
      type: 'Action.OpenUrl',
      title: 'FutureVuls で詳細を見る',
      url: 'https://vuls.biz/'
    }
  ];

  return card;
}

// ===== API エンドポイント =====

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FutureVuls Teams MCP Bridge v2.0',
    features: ['Azure OpenAI Integration', 'Natural Language Understanding'],
    azureOpenAI: {
      configured: !!openAIClient,
      deployment: azureOpenAIDeployment
    },
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// Teams/Power Automate からのクエリを処理
app.post('/api/query', async (req, res) => {
  try {
    const { query, group } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'query パラメータが必要です',
        example: { query: "脆弱性を教えて", group: "ERMS" }
      });
    }

    console.log(`\n📨 新しいリクエスト`);
    console.log(`   質問: "${query}"`);
    console.log(`   グループ: ${group || '(指定なし)'}`);

    // グループ名からgroupIdを解決
    let groupId = null;
    if (group) {
      const groups = await mcpClient.callTool('futurevuls_list_groups', {});
      const groupInfo = groups.find(g => 
        g.groupName === group || 
        g.groupId === group
      );
      
      if (groupInfo) {
        groupId = groupInfo.groupId;
        console.log(`   → グループID: ${groupId}`);
      } else {
        console.log(`   ⚠️  グループ "${group}" が見つかりません`);
      }
    }

    // Azure OpenAI でクエリを解析
    const { tool, args, explanation } = await parseQueryWithAzureOpenAI(query, groupId);

    // MCP ツールを実行
    console.log(`🔧 MCPツール実行: ${tool}`);
    const result = await mcpClient.callTool(tool, args);
    
    console.log(`✅ 実行完了`);

    // Adaptive Card を生成
    const card = createAdaptiveCard(
      explanation || tool,
      result,
      { query, tool, explanation, group }
    );

    res.json(card);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    res.status(500).json({
      error: error.message,
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [{
            type: 'TextBlock',
            text: `❌ エラーが発生しました\n\n${error.message}`,
            wrap: true,
            color: 'attention'
          }]
        }
      }]
    });
  }
});

// 直接MCPツール呼び出し（デバッグ用）
app.post('/api/tool', async (req, res) => {
  try {
    const { tool, args } = req.body;
    
    if (!tool) {
      return res.status(400).json({ error: 'tool パラメータが必要です' });
    }

    console.log(`🔧 直接ツール呼び出し: ${tool}`);
    const result = await mcpClient.callTool(tool, args || {});
    
    res.json({ success: true, result });

  } catch (error) {
    console.error('❌ エラー:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== サーバー起動 =====
async function main() {
  try {
    // Azure OpenAI 設定チェック
    if (!azureOpenAIEndpoint || !azureOpenAIKey) {
      console.warn('⚠️  警告: Azure OpenAI が設定されていません');
      console.warn('   自然言語理解機能は無効化されます');
      console.warn('   .env ファイルを確認してください');
    }

    // MCP Server 起動
    await mcpClient.start();

    // HTTP Server 起動
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 FutureVuls Teams MCP Bridge v2.0 起動完了!');
      console.log('='.repeat(60));
      console.log(`📡 サーバー: http://localhost:${PORT}`);
      console.log(`🤖 AI エンジン: Azure OpenAI (${azureOpenAIDeployment})`);
      console.log(`🔧 MCP Server: ${process.env.MCP_SERVER_PATH}`);
      console.log('='.repeat(60));
      console.log('\n💡 使用例:');
      console.log('  POST http://localhost:3000/api/query');
      console.log('  {"query": "CVE-2025- で始まる脆弱性を教えて", "group": "ERMS"}');
      console.log('\n  {"query": "重大な脆弱性はありますか？", "group": "ERMS"}');
      console.log('\n  {"query": "グループ一覧を見せて"}');
      console.log('\n✨ 自然言語で質問できます！\n');
    });

  } catch (error) {
    console.error('❌ 起動エラー:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

// 起動
main();
