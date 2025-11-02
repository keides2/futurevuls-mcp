#!/usr/bin/env node

/**
 * Test notification script
 * 
 * Teams への通知をテスト
 */

require('dotenv').config();

// サンプルデータ
const sampleVulnerabilities = [
  {
    cveID: 'CVE-2024-12345',
    severity: 'critical',
    summary: 'Apache HTTP Server リモートコード実行の脆弱性',
    cvss: { score: 9.8 },
    serverName: 'web-server-01'
  },
  {
    cveID: 'CVE-2024-67890',
    severity: 'high',
    summary: 'OpenSSL 情報漏洩の脆弱性',
    cvss: { score: 8.1 },
    serverName: 'api-server-01'
  },
  {
    cveID: 'CVE-2024-11111',
    severity: 'high',
    summary: 'PostgreSQL SQLインジェクションの脆弱性',
    cvss: { score: 7.5 },
    serverName: 'db-server-01'
  },
  {
    cveID: 'CVE-2024-22222',
    severity: 'medium',
    summary: 'Node.js パストラバーサルの脆弱性',
    cvss: { score: 6.5 },
    serverName: 'app-server-01'
  },
  {
    cveID: 'CVE-2024-33333',
    severity: 'medium',
    summary: 'nginx 設定不備による情報漏洩',
    cvss: { score: 5.3 },
    serverName: 'web-server-02'
  }
];

async function testNotification() {
  try {
    console.log('🧪 Teams 通知のテストを開始します...\n');
    
    // teams-notifier をインポート
    const { sendToTeams, createAdaptiveCard } = require('./teams-notifier');
    
    // Adaptive Card を作成
    console.log('📝 Adaptive Card を作成中...');
    const card = createAdaptiveCard(sampleVulnerabilities, 'Test Group');
    
    // Teams に送信
    console.log('📤 Teams に送信中...');
    await sendToTeams(card);
    
    console.log('\n✅ テスト通知の送信に成功しました!');
    console.log('   Teams チャネルを確認してください。');
    
  } catch (error) {
    console.error('\n❌ テスト通知の送信に失敗しました:');
    console.error(`   ${error.message}`);
    
    if (process.env.DEBUG === 'true') {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    } else {
      console.error('\n詳細を確認するには DEBUG=true を設定してください。');
    }
    
    process.exit(1);
  }
}

// 環境変数チェック
if (!process.env.TEAMS_WEBHOOK_URL) {
  console.error('❌ TEAMS_WEBHOOK_URL が設定されていません');
  console.error('   .env ファイルを確認してください');
  process.exit(1);
}

// テスト実行
testNotification();
