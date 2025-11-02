#!/usr/bin/env node

/**
 * Teams/Power Automate ⇔ FutureVuls MCP Bridge Server
 * 
 * Teams からの自然言語クエリを MCP に変換し、結果を Adaptive Card で返す
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DEBUG = process.env.DEBUG === 'true';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// デバッグログ
function debugLog(message, data = null) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`);
    if (data) console.error(JSON.stringify(data, null, 2));
  }
}

// MCP サーバーとの通信クラス
class MCPClient {
  constructor() {
    this.mcpProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  // MCP サーバーを起動
  start() {
    const mcpPath = path.resolve(__dirname, process.env.MCP_SERVER_PATH || '../futurevuls-mcp.js');
    
    debugLog(`Starting MCP server: ${mcpPath}`);
    
    this.mcpProcess = spawn('node', [mcpPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    // 標準出力からのレスポンスを処理
    let buffer = '';
    this.mcpProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 最後の不完全な行を保持

      lines.forEach(line => {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            debugLog('MCP Response:', response);
            
            if (response.id && this.pendingRequests.has(response.id)) {
              const { resolve, reject } = this.pendingRequests.get(response.id);
              this.pendingRequests.delete(response.id);
              
              if (response.error) {
                reject(new Error(response.error.message || 'MCP Error'));
              } else {
                resolve(response.result);
              }
            }
          } catch (error) {
            debugLog('Failed to parse MCP response:', error.message);
          }
        }
      });
    });

    this.mcpProcess.stderr.on('data', (data) => {
      debugLog('MCP stderr:', data.toString());
    });

    this.mcpProcess.on('close', (code) => {
      console.log(`MCP process exited with code ${code}`);
    });

    // 初期化リクエスト
    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'teams-mcp-bridge',
        version: '1.0.0'
      }
    });
  }

  // MCP にリクエストを送信
  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      debugLog('Sending to MCP:', request);
      
      this.mcpProcess.stdin.write(requestStr);

      // タイムアウト設定
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000);
    });
  }

  // MCP ツールを呼び出し
  async callTool(toolName, args) {
    return await this.sendRequest('tools/call', {
      name: toolName,
      arguments: args
    });
  }

  // クリーンアップ
  stop() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
  }
}

// グローバル MCP クライアント
const mcpClient = new MCPClient();

// 自然言語クエリを MCP ツール呼び出しに変換
function parseQuery(query, requestArgs = {}) {
  const lowerQuery = query.toLowerCase();
  
  // リクエストから直接パラメータを受け取る（最優先）
  if (requestArgs.tool) {
    return {
      tool: requestArgs.tool,
      args: requestArgs.args || {}
    };
  }
  
  // CVE ID パターンマッチング（例: CVE-2025-, CVE-2024-12345）
  const cvePattern = /cve-(\d{4})-?(\d*)/i;
  const cveMatch = query.match(cvePattern);
  
  if (cveMatch) {
    const year = cveMatch[1];
    const number = cveMatch[2];
    
    if (number) {
      // 完全なCVE ID: CVE-2025-12345
      return {
        tool: 'futurevuls_get_cve_detail',
        args: { cveId: `CVE-${year}-${number}` }
      };
    } else {
      // 年のみ: CVE-2025-
      return {
        tool: 'futurevuls_get_cves',
        args: { 
          page: 1, 
          limit: 50,
          filterCveId: `CVE-${year}-`
        }
      };
    }
  }
  
  // 脆弱性関連
  if (lowerQuery.includes('脆弱性') || lowerQuery.includes('cve') || lowerQuery.includes('vulnerability')) {
    if (lowerQuery.includes('critical') || lowerQuery.includes('重大') || lowerQuery.includes('クリティカル')) {
      return { 
        tool: 'futurevuls_search_critical_cves', 
        args: { 
          startDate: getDateString(-7), // 1週間前から
          endDate: getDateString(0),    // 今日まで
          minCvss: 9.0 
        } 
      };
    }
    return { tool: 'futurevuls_get_cves', args: { page: 1, limit: 20 } };
  }
  
  // タスク関連
  if (lowerQuery.includes('タスク') || lowerQuery.includes('task')) {
    return { tool: 'futurevuls_get_tasks', args: { page: 1, limit: 20 } };
  }
  
  // サーバー関連
  if (lowerQuery.includes('サーバー') || lowerQuery.includes('server')) {
    return { tool: 'futurevuls_get_servers', args: { page: 1, limit: 20 } };
  }
  
  // グループ一覧
  if (lowerQuery.includes('グループ') || lowerQuery.includes('group')) {
    return { tool: 'futurevuls_list_groups', args: {} };
  }
  
  // レポート関連
  if (lowerQuery.includes('レポート') || lowerQuery.includes('report') || lowerQuery.includes('週次')) {
    return { tool: 'futurevuls_generate_weekly_report', args: {} };
  }
  
  // ヘルスチェック
  if (lowerQuery.includes('ヘルス') || lowerQuery.includes('health') || lowerQuery.includes('接続') || lowerQuery.includes('状態')) {
    return { tool: 'futurevuls_health_check', args: {} };
  }
  
  // ヘルプ
  if (lowerQuery.includes('ヘルプ') || lowerQuery.includes('help') || lowerQuery.includes('使い方')) {
    return { tool: 'futurevuls_list_groups', args: {} }; // グループ一覧をヘルプ代わりに表示
  }
  
  // デフォルト: グループ一覧
  return { tool: 'futurevuls_list_groups', args: {} };
}

// 日付文字列を生成（YYYYMMDD形式）
function getDateString(daysOffset) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Adaptive Card を生成
function createAdaptiveCard(title, data, queryInfo) {
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
            type: 'TextBlock',
            text: `🔒 ${title}`,
            weight: 'bolder',
            size: 'large',
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `クエリ: ${queryInfo.query}`,
            spacing: 'none',
            isSubtle: true,
            wrap: true
          },
          {
            type: 'TextBlock',
            text: `実行日時: ${new Date().toLocaleString('ja-JP')}`,
            spacing: 'none',
            isSubtle: true
          }
        ]
      }
    }]
  };

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
  } else if (typeof data === 'string') {
    card.attachments[0].content.body.push({
      type: 'TextBlock',
      text: data,
      wrap: true,
      separator: true
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
    service: 'FutureVuls Teams MCP Bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Teams/Power Automate からのクエリを処理
app.post('/api/query', async (req, res) => {
  try {
    const { query, group, tool, args } = req.body;
    
    if (!query && !tool) {
      return res.status(400).json({ error: 'query または tool パラメータが必要です' });
    }

    // UTF-8 エンコーディングを確保
    const decodedQuery = query ? Buffer.from(query, 'utf8').toString('utf8') : '';
    
    console.log(`📨 受信: ${tool ? `tool=${tool}` : `query="${decodedQuery}"`} (グループ: ${group || 'default'})`);

    // クエリを解析してMCPツール呼び出しに変換（tool/args が指定されていればそれを優先）
    const parsedQuery = parseQuery(decodedQuery, { tool, args });
    
    console.log(`🔧 MCPツール呼び出し: ${parsedQuery.tool}`);
    debugLog('Tool arguments:', parsedQuery.args);

    // MCP ツールを実行
    const result = await mcpClient.callTool(parsedQuery.tool, parsedQuery.args);
    
    debugLog('Tool result:', result);

    // Adaptive Card を生成
    const card = createAdaptiveCard(
      'FutureVuls レポート',
      result,
      { query: decodedQuery || `${tool}()`, tool: parsedQuery.tool, group }
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
            text: `❌ エラーが発生しました: ${error.message}`,
            wrap: true,
            color: 'attention'
          }]
        }
      }]
    });
  }
});

// サーバー起動
async function startServer() {
  try {
    console.log('🚀 Teams MCP Bridge を起動しています...');
    
    // MCP サーバーを起動
    await mcpClient.start();
    console.log('✅ MCP サーバーと接続しました');

    // Express サーバーを起動
    app.listen(PORT, () => {
      console.log(`📡 Bridge サーバーが起動しました`);
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   エンドポイント: POST /api/query`);
      console.log('');
      console.log('💡 使い方:');
      console.log('   Power Automate から以下のようなクエリを送信:');
      console.log('   { "query": "Critical な脆弱性を教えて" }');
      console.log('');
    });

  } catch (error) {
    console.error('❌ 起動エラー:', error.message);
    process.exit(1);
  }
}

// クリーンアップ
process.on('SIGINT', () => {
  console.log('\n👋 Bridge サーバーを終了しています...');
  mcpClient.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Bridge サーバーを終了しています...');
  mcpClient.stop();
  process.exit(0);
});

// サーバー起動
startServer();
