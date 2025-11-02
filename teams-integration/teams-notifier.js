#!/usr/bin/env node

/**
 * FutureVuls Teams Notifier
 * 
 * FutureVuls の脆弱性情報を Microsoft Teams に通知
 * Power Automate の Webhook を使用
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');

// 環境変数
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const DEBUG = process.env.DEBUG === 'true';
const MIN_SEVERITY = process.env.MIN_SEVERITY || 'high';

// プロキシ設定
const HTTPS_PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const agent = HTTPS_PROXY ? new HttpsProxyAgent(HTTPS_PROXY) : undefined;

// デバッグログ
function debugLog(message, data = null) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
  }
}

// groups.json を読み込む
function loadGroupsConfig() {
  const groupsPath = process.env.GROUPS_JSON_PATH || '../groups.json';
  const fullPath = path.resolve(__dirname, groupsPath);
  
  try {
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`groups.json の読み込みに失敗: ${error.message}`);
    return null;
  }
}

// FutureVuls API を呼び出す
async function callFutureVulsAPI(endpoint, token, orgToken) {
  const url = `https://vuls.biz/api/v1${endpoint}`;
  
  debugLog(`API呼び出し: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': token,
      'X-Vuls-OS-Family': 'all',
      'X-Vuls-Org-Token': orgToken,
      'Content-Type': 'application/json'
    },
    agent
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// 脆弱性の重要度レベルを数値化
function getSeverityLevel(severity) {
  const levels = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
    'info': 0
  };
  return levels[severity?.toLowerCase()] || 0;
}

// 脆弱性の色を取得
function getSeverityColor(severity) {
  const colors = {
    'critical': 'attention',  // 赤
    'high': 'warning',        // オレンジ
    'medium': 'good',         // 黄
    'low': 'accent',          // 青
    'info': 'default'         // グレー
  };
  return colors[severity?.toLowerCase()] || 'default';
}

// Adaptive Card を作成
function createAdaptiveCard(vulnerabilities, groupName = 'Default') {
  const minLevel = getSeverityLevel(MIN_SEVERITY);
  const filtered = vulnerabilities.filter(v => 
    getSeverityLevel(v.severity) >= minLevel
  );
  
  // 重要度別カウント
  const counts = {
    critical: filtered.filter(v => v.severity?.toLowerCase() === 'critical').length,
    high: filtered.filter(v => v.severity?.toLowerCase() === 'high').length,
    medium: filtered.filter(v => v.severity?.toLowerCase() === 'medium').length,
    low: filtered.filter(v => v.severity?.toLowerCase() === 'low').length
  };
  
  // トップ10の脆弱性
  const top10 = filtered
    .sort((a, b) => getSeverityLevel(b.severity) - getSeverityLevel(a.severity))
    .slice(0, 10);
  
  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `🔒 FutureVuls 脆弱性レポート`,
              weight: 'bolder',
              size: 'large',
              wrap: true
            },
            {
              type: 'TextBlock',
              text: `グループ: ${groupName}`,
              spacing: 'none',
              isSubtle: true
            },
            {
              type: 'TextBlock',
              text: `検出日時: ${new Date().toLocaleString('ja-JP')}`,
              spacing: 'none',
              isSubtle: true
            },
            {
              type: 'FactSet',
              facts: [
                { title: '🔴 Critical', value: counts.critical.toString() },
                { title: '🟠 High', value: counts.high.toString() },
                { title: '🟡 Medium', value: counts.medium.toString() },
                { title: '🔵 Low', value: counts.low.toString() }
              ]
            },
            {
              type: 'TextBlock',
              text: '主要な脆弱性 (上位10件)',
              weight: 'bolder',
              size: 'medium',
              separator: true
            },
            ...top10.map(vuln => ({
              type: 'Container',
              spacing: 'small',
              separator: true,
              items: [
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: vuln.cveID || 'N/A',
                          weight: 'bolder',
                          color: getSeverityColor(vuln.severity)
                        }
                      ]
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: vuln.summary || 'No summary available',
                          wrap: true,
                          maxLines: 2
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'FactSet',
                  facts: [
                    { title: 'Severity', value: vuln.severity || 'Unknown' },
                    { title: 'Score', value: (vuln.cvss?.score || 'N/A').toString() },
                    { title: 'Server', value: vuln.serverName || 'Unknown' }
                  ]
                }
              ]
            }))
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'FutureVuls で詳細を見る',
              url: 'https://vuls.biz/'
            }
          ]
        }
      }
    ]
  };
  
  return card;
}

// Teams に通知を送信
async function sendToTeams(card) {
  if (!TEAMS_WEBHOOK_URL) {
    throw new Error('TEAMS_WEBHOOK_URL が設定されていません');
  }
  
  debugLog('Teams への送信:', card);
  
  const response = await fetch(TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(card),
    agent
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Teams Webhook Error: ${response.status} - ${errorText}`);
  }
  
  console.log('✅ Teams への通知送信が完了しました');
}

// メイン処理
async function main() {
  try {
    console.log('🚀 FutureVuls Teams Notifier を起動しています...');
    
    // groups.json を読み込む
    const groupsConfig = loadGroupsConfig();
    if (!groupsConfig || !groupsConfig.group) {
      throw new Error('groups.json の読み込みに失敗しました');
    }
    
    // 各グループの脆弱性を取得
    for (const groupObj of groupsConfig.group) {
      const groupName = Object.keys(groupObj)[0];
      const [token, totalPages, groupId] = groupObj[groupName];
      
      console.log(`\n📊 グループ "${groupName}" の脆弱性を取得中...`);
      
      // CVE一覧を取得
      const data = await callFutureVulsAPI('/v1/cves', token, groupId);
      
      // 脆弱性を抽出
      const vulnerabilities = [];
      if (data.cves && Array.isArray(data.cves)) {
        data.cves.forEach(cve => {
          // サーバー情報を取得
          const serverName = cve.servers && cve.servers.length > 0 
            ? cve.servers[0].serverName 
            : 'Unknown';
          
          vulnerabilities.push({
            cveID: cve.cveID,
            severity: cve.severity || (cve.maxV3 >= 9.0 ? 'critical' : cve.maxV3 >= 7.0 ? 'high' : cve.maxV3 >= 4.0 ? 'medium' : 'low'),
            summary: cve.summary,
            cvss: { score: cve.maxV3 || cve.maxV2 || 0 },
            serverName: serverName
          });
        });
      }
      
      console.log(`   検出された脆弱性: ${vulnerabilities.length}件`);
      
      if (vulnerabilities.length > 0) {
        // Adaptive Card を作成
        const card = createAdaptiveCard(vulnerabilities, groupName);
        
        // Teams に送信
        await sendToTeams(card);
      } else {
        console.log('   通知する脆弱性はありません');
      }
    }
    
    console.log('\n✨ 処理が完了しました');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    if (DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = { sendToTeams, createAdaptiveCard };
