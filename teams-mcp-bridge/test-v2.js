#!/usr/bin/env node
/**
 * FutureVuls Teams MCP Bridge v2.0 テストスクリプト
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (err) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 FutureVuls Teams MCP Bridge v2.0 テスト開始\n');

  const tests = [
    {
      name: 'グループ一覧',
      query: 'グループ一覧を見せて'
    },
    {
      name: '脆弱性検索（基本）',
      query: '脆弱性を教えて',
      group: 'ERMS'
    },
    {
      name: 'CVE-2025- 検索',
      query: 'CVE-2025- で始まる脆弱性を教えて',
      group: 'ERMS'
    },
    {
      name: '重大な脆弱性',
      query: '重大な脆弱性はありますか？',
      group: 'ERMS'
    },
    {
      name: 'CVSS 9.0以上',
      query: 'CVSS スコア 9.0 以上の脆弱性を探して',
      group: 'ERMS'
    },
    {
      name: 'サーバー一覧',
      query: 'サーバーの一覧を見せて',
      group: 'ERMS'
    },
    {
      name: 'ヘルスチェック',
      query: 'ヘルスチェック'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📝 テスト: ${test.name}`);
      console.log(`   質問: "${test.query}"`);
      if (test.group) {
        console.log(`   グループ: ${test.group}`);
      }

      const result = await makeRequest('/api/query', {
        query: test.query,
        group: test.group
      });

      if (result.error) {
        console.log(`   ❌ 失敗: ${result.error}\n`);
        failed++;
      } else {
        console.log(`   ✅ 成功`);
        
        // Adaptive Cardの構造チェック
        if (result.type === 'message' && result.attachments && result.attachments[0]) {
          console.log(`   📊 Adaptive Card: OK`);
          const card = result.attachments[0].content;
          if (card.body && card.body.length > 0) {
            console.log(`   📄 コンテンツ要素: ${card.body.length} 個`);
          }
        }
        
        console.log('');
        passed++;
      }

      // レート制限対策
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(60));
  console.log(`📊 テスト結果: ${passed} 成功 / ${failed} 失敗 / ${tests.length} 合計`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('✨ すべてのテストが成功しました！');
  } else {
    console.log('⚠️  一部のテストが失敗しました');
  }
}

// メイン実行
console.log('⏳ サーバーの起動を待っています...\n');

setTimeout(() => {
  runTests().catch(error => {
    console.error('❌ テスト実行エラー:', error);
    process.exit(1);
  });
}, 3000);
