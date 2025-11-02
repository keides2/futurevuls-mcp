#!/usr/bin/env node

/**
 * Scheduler for FutureVuls Teams Notifications
 * 
 * cron を使用して定期的に Teams に通知を送信
 */

require('dotenv').config();
const cron = require('node-cron');
const { execSync } = require('child_process');
const path = require('path');

// 環境変数
const WEEKLY_REPORT_SCHEDULE = process.env.WEEKLY_REPORT_SCHEDULE || '0 9 * * 1'; // 毎週月曜 9:00

console.log('📅 FutureVuls Teams Notification Scheduler を起動しました');
console.log(`⏰ スケジュール: ${WEEKLY_REPORT_SCHEDULE}`);
console.log('   (cron形式: 分 時 日 月 曜日)');
console.log('');

// 週次レポートのスケジュール
cron.schedule(WEEKLY_REPORT_SCHEDULE, () => {
  console.log(`\n🔔 [${new Date().toLocaleString('ja-JP')}] 週次レポートを実行中...`);
  
  try {
    const scriptPath = path.join(__dirname, 'teams-notifier.js');
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log('✅ 週次レポート送信完了');
  } catch (error) {
    console.error('❌ レポート送信エラー:', error.message);
  }
});

console.log('✨ スケジューラーが起動しました');
console.log('   Ctrl+C で終了できます');

// プロセスを維持
process.on('SIGINT', () => {
  console.log('\n\n👋 スケジューラーを終了します...');
  process.exit(0);
});
