#!/usr/bin/env node

/**
 * FutureVuls MCP Server Health Check
 * groups.json読み込みテスト
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// デバッグモードを有効化
process.env.FUTUREVULS_DEBUG = 'true';

console.log('=== FutureVuls MCP Server Health Check ===\n');

// スクリプトのパスを直接指定（親ディレクトリのfuturevuls-mcp.js）
const mcpScriptPath = path.join(__dirname, '..', 'futurevuls-mcp.js');
console.log(`スクリプトパス: ${mcpScriptPath}\n`);

const mcp = spawn('node', [mcpScriptPath], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env
});

const rl = readline.createInterface({
  input: mcp.stdout,
  crlfDelay: Infinity
});

let initialized = false;

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    
    if (response.result && response.result.serverInfo) {
      console.log('✓ サーバー初期化成功');
      console.log(`  名前: ${response.result.serverInfo.name}`);
      console.log(`  バージョン: ${response.result.serverInfo.version}\n`);
      
      // ツールリストを取得
      sendRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    } else if (response.result && response.result.tools) {
      console.log(`✓ ツール一覧取得成功 (${response.result.tools.length}個のツール)\n`);
      
      // 主要ツールを表示
      const mainTools = response.result.tools.filter(t => 
        t.name.includes('weekly') || t.name.includes('health')
      );
      console.log('主要ツール:');
      mainTools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
      
      console.log('\n✓ ヘルスチェック完了\n');
      process.exit(0);
    }
  } catch (error) {
    // JSON以外の出力(デバッグログなど)は無視
  }
});

mcp.on('error', (error) => {
  console.error('✗ サーバー起動エラー:', error.message);
  process.exit(1);
});

mcp.on('exit', (code) => {
  if (code !== 0 && !initialized) {
    console.error(`✗ サーバーが終了しました (終了コード: ${code})`);
    process.exit(1);
  }
});

function sendRequest(request) {
  mcp.stdin.write(JSON.stringify(request) + '\n');
}

// 初期化リクエストを送信
setTimeout(() => {
  console.log('サーバーに接続中...\n');
  sendRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'health-check', version: '1.0.0' }
    }
  });
  initialized = true;
}, 500);

// タイムアウト
setTimeout(() => {
  console.error('✗ タイムアウト: サーバーが応答しません');
  process.exit(1);
}, 10000);
