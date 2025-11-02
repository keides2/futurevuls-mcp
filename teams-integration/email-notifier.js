#!/usr/bin/env node

/**
 * Email Notifier for FutureVuls
 * 
 * Teams の代わりにメール通知を使用
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

// 環境変数
const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL || process.env.TEAMS_WEBHOOK_URL;
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined;

/**
 * メール形式のメッセージを作成
 */
function createEmailMessage(vulnerabilities, groupName = 'Default') {
  const counts = {
    critical: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'critical').length,
    high: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'high').length,
    medium: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'medium').length,
    low: vulnerabilities.filter(v => v.severity?.toLowerCase() === 'low').length
  };

  const top10 = vulnerabilities
    .sort((a, b) => {
      const levels = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return (levels[b.severity?.toLowerCase()] || 0) - (levels[a.severity?.toLowerCase()] || 0);
    })
    .slice(0, 10);

  let message = `🔒 FutureVuls 脆弱性レポート\n`;
  message += `グループ: ${groupName}\n`;
  message += `検出日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  message += `📊 サマリー\n`;
  message += `🔴 Critical: ${counts.critical}\n`;
  message += `🟠 High: ${counts.high}\n`;
  message += `🟡 Medium: ${counts.medium}\n`;
  message += `🔵 Low: ${counts.low}\n\n`;
  message += `主要な脆弱性 (上位10件)\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  top10.forEach((vuln, index) => {
    message += `\n${index + 1}. ${vuln.cveID || 'N/A'}\n`;
    message += `   ${vuln.summary || 'No summary'}\n`;
    message += `   Severity: ${vuln.severity} | Score: ${vuln.cvss?.score || 'N/A'} | Server: ${vuln.serverName}\n`;
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `詳細: https://vuls.biz/\n`;

  return message;
}

/**
 * Power Automate 経由でメール送信
 */
async function sendEmail(message) {
  if (!EMAIL_WEBHOOK_URL) {
    throw new Error('EMAIL_WEBHOOK_URL または TEAMS_WEBHOOK_URL が設定されていません');
  }

  const body = {
    text: message,
    title: '🔒 FutureVuls 脆弱性レポート'
  };

  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    agent
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Webhook Error: ${response.status} - ${errorText}`);
  }

  console.log('✅ 通知の送信が完了しました');
}

module.exports = { createEmailMessage, sendEmail };
